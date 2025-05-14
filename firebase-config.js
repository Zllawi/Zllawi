// تكوين Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD2o_-ZKbJBVu4Dsr0rVfGQdtYNPJrOuHs",
  authDomain: "mafia-game-zlawi.firebaseapp.com",
  projectId: "mafia-game-zlawi",
  storageBucket: "mafia-game-zlawi.appspot.com",
  messagingSenderId: "825997210461",
  databaseURL: "https://mafia-game-zlawi-default-rtdb.firebaseio.com",
  appId: "1:825997210461:web:64c97992a5c8b7b9a51f88"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// الحصول على مرجع قاعدة البيانات
const database = firebase.database();

// إنشاء معرّف فريد للمستخدم إذا لم يكن موجوداً
if (!localStorage.getItem('user_id')) {
  localStorage.setItem('user_id', 'user_' + Math.random().toString(36).substr(2, 9));
}

// الحصول على معرّف المستخدم
const userId = localStorage.getItem('user_id'); 