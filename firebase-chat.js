/* ==========================================================
   Walkie-Talkie Translator — Firebase chat backend
   Phases 2-4: friends, 1-on-1 chat, groups, file sharing.

   REQUIRES: firebase-config.js loaded first with real project
   values, and the Firebase compat SDK loaded in index.html (see
   FIREBASE_SETUP.md for the exact <script> tags).

   DESIGN: messages are stored and synced in their ORIGINAL
   language only — nothing is translated server-side. Each
   device translates incoming messages locally, on read, using
   its own configured Gemini key(s) / MyMemory / offline
   dictionary (the exact fallback chain already built into
   app.js). This means:
     - No server-side translation cost or infrastructure needed
     - Each person's translation quota is their own — one busy
       group doesn't burn through a shared server quota
     - A message written once can be read correctly by every
       member of a group regardless of their chosen language
========================================================== */

let fbApp = null, fbAuth = null, fbDb = null, fbStorage = null;
let currentUser = null; // { uid, displayName, friendCode }

function fbReady(){
  return !!(fbAuth && fbAuth.currentUser);
}

/** Call once on startup (after firebase-config.js + SDK scripts are loaded). */
async function fbInit(){
  if(typeof firebase === 'undefined'){
    console.error('Firebase SDK not loaded — check the <script> tags in index.html');
    return false;
  }
  fbApp = firebase.initializeApp(FIREBASE_CONFIG);
  fbAuth = firebase.auth();
  fbDb = firebase.firestore();
  fbStorage = firebase.storage();

  // Anonymous auth: no email/password signup needed. displayName + a
  // short shareable "friend code" are what people actually use to find
  // and add each other.
  if(!fbAuth.currentUser){
    await fbAuth.signInAnonymously();
  }
  const uid = fbAuth.currentUser.uid;
  const userDoc = await fbDb.collection('users').doc(uid).get();
  if(!userDoc.exists){
    const friendCode = generateFriendCode();
    await fbDb.collection('users').doc(uid).set({
      displayName: 'New User',
      friendCode,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    currentUser = { uid, displayName: 'New User', friendCode };
  } else {
    currentUser = { uid, ...userDoc.data() };
  }
  return true;
}

function generateFriendCode(){
  // 6-digit code, easy to read out loud or type — not meant to be
  // cryptographically unguessable, just a convenient "add me" handle.
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function fbSetDisplayName(name){
  if(!fbReady()) return;
  await fbDb.collection('users').doc(currentUser.uid).update({ displayName: name });
  currentUser.displayName = name;
}

/* ---------------- Friends ---------------- */

async function fbAddFriendByCode(code){
  const snap = await fbDb.collection('users').where('friendCode', '==', code.trim()).limit(1).get();
  if(snap.empty) return { ok: false, reason: 'not_found' };
  const friendDoc = snap.docs[0];
  if(friendDoc.id === currentUser.uid) return { ok: false, reason: 'self' };
  const batch = fbDb.batch();
  batch.set(fbDb.collection('users').doc(currentUser.uid).collection('friends').doc(friendDoc.id), {
    displayName: friendDoc.data().displayName,
    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(fbDb.collection('users').doc(friendDoc.id).collection('friends').doc(currentUser.uid), {
    displayName: currentUser.displayName,
    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { ok: true, friendUid: friendDoc.id, displayName: friendDoc.data().displayName };
}

function fbListenFriends(callback){
  if(!fbReady()) return () => {};
  return fbDb.collection('users').doc(currentUser.uid).collection('friends')
    .onSnapshot(snap => callback(snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
}

/* ---------------- 1-on-1 chat ---------------- */

function chatIdFor(uidA, uidB){
  return [uidA, uidB].sort().join('_');
}

async function fbSendDirectMessage(friendUid, { originalText, sourceLangCode, fileUrl, fileType }){
  const chatId = chatIdFor(currentUser.uid, friendUid);
  await fbDb.collection('chats').doc(chatId).collection('messages').add({
    senderId: currentUser.uid,
    originalText: originalText || '',
    sourceLangCode: sourceLangCode || '',
    fileUrl: fileUrl || null,
    fileType: fileType || null, // 'image' | 'file' | 'audio'
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await fbDb.collection('chats').doc(chatId).set({
    members: [currentUser.uid, friendUid],
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

function fbListenDirectChat(friendUid, callback){
  const chatId = chatIdFor(currentUser.uid, friendUid);
  return fbDb.collection('chats').doc(chatId).collection('messages')
    .orderBy('createdAt', 'asc').limitToLast(200)
    .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

/* ---------------- Group chat ---------------- */

async function fbCreateGroup(name, memberUids){
  const members = Array.from(new Set([currentUser.uid, ...memberUids]));
  const ref = await fbDb.collection('groups').add({
    name,
    members,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function fbSendGroupMessage(groupId, { originalText, sourceLangCode, fileUrl, fileType }){
  await fbDb.collection('groups').doc(groupId).collection('messages').add({
    senderId: currentUser.uid,
    originalText: originalText || '',
    sourceLangCode: sourceLangCode || '',
    fileUrl: fileUrl || null,
    fileType: fileType || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await fbDb.collection('groups').doc(groupId).update({ lastMessageAt: firebase.firestore.FieldValue.serverTimestamp() });
}

function fbListenGroupChat(groupId, callback){
  return fbDb.collection('groups').doc(groupId).collection('messages')
    .orderBy('createdAt', 'asc').limitToLast(200)
    .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

function fbListenMyGroups(callback){
  if(!fbReady()) return () => {};
  return fbDb.collection('groups').where('members', 'array-contains', currentUser.uid)
    .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

/* ---------------- File / photo upload ---------------- */

async function fbUploadFile(file, folder){
  const path = `${folder}/${currentUser.uid}/${Date.now()}_${file.name}`;
  const ref = fbStorage.ref(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}

/**
 * Translates an incoming message's originalText into the CURRENT device's
 * chosen language, reusing the app's existing fallback chain (Gemini keys
 * → MyMemory → offline dictionary) — nothing new to build here, this just
 * calls into what app.js already has.
 */
async function fbTranslateIncoming(originalText, sourceLangCode, targetLangCode){
  if(!originalText) return '';
  if(sourceLangCode === targetLangCode) return originalText;
  const sourceLang = langByCode(sourceLangCode) || { name: 'the source language', code: sourceLangCode || 'auto' };
  const targetLang = langByCode(targetLangCode);
  if(!targetLang) return originalText;
  try{
    const resp = await geminiFetch('gemini-3.6-flash', {
      contents: [{ parts: [{ text: buildTranslationPrompt(originalText, sourceLang, targetLang) }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: 'minimal' } }
    });
    if(resp.ok){
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if(text) return text;
    }
  }catch(e){ console.error('Incoming-message translation failed:', e); }
  const fallback = await fallbackTranslateChain(originalText, sourceLangCode || 'autodetect', targetLangCode);
  return fallback ? fallback.text : originalText;
}
