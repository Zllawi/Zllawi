document.addEventListener('DOMContentLoaded', () => {
    const playerNameInput = document.getElementById('playerName');
    const playerCountSelect = document.getElementById('playerCount');
    const createGameBtn = document.getElementById('createGameBtn');
    const setupForm = document.querySelector('.setup-form');
    const gameInfo = document.querySelector('.game-info');
    const gameCodeElement = document.getElementById('gameCode');
    const copyCodeBtn = document.getElementById('copyCode');
    const playerCounter = document.getElementById('playerCounter');
    const totalPlayers = document.getElementById('totalPlayers');
    const startGameBtn = document.getElementById('startGameBtn');

    // إنشاء رمز عشوائي للعبة
    function generateGameCode() {
        return Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    // الاستماع إلى تغييرات اللاعبين في الغرفة
    function listenToPlayersChanges(gameCode, maxPlayers) {
        const gameRef = database.ref(`games/${gameCode}`);
        
        // الاستماع إلى إضافة لاعبين جدد
        gameRef.child('players').on('value', (snapshot) => {
            const players = snapshot.val() || {};
            const playersCount = Object.keys(players).length;
            
            // تحديث عداد اللاعبين
            playerCounter.textContent = playersCount;
            
            // تمكين زر بدء اللعبة عندما يصل عدد اللاعبين إلى ثلاثة على الأقل
            if (playersCount >= 3) {
                startGameBtn.disabled = false;
            } else {
                startGameBtn.disabled = true;
            }

            // تحقق مما إذا تم بدء اللعبة
            gameRef.child('status').once('value', (statusSnapshot) => {
                const status = statusSnapshot.val();
                if (status === 'started') {
                    window.location.href = 'game.html';
                }
            });
        });
    }

    createGameBtn.addEventListener('click', () => {
        // التحقق من إدخال اسم اللاعب
        const playerName = playerNameInput.value.trim();
        if (!playerName) {
            alert('الرجاء إدخال اسمك');
            return;
        }

        // إخفاء نموذج الإعداد وإظهار معلومات اللعبة
        setupForm.style.display = 'none';
        gameInfo.style.display = 'block';

        // إنشاء رمز للعبة وعرضه
        const gameCode = generateGameCode();
        gameCodeElement.textContent = gameCode;

        // تحديد عدد اللاعبين
        const maxPlayers = parseInt(playerCountSelect.value);
        totalPlayers.textContent = maxPlayers;

        // إنشاء غرفة اللعبة في Firebase
        const gameRef = database.ref(`games/${gameCode}`);
        
        // حفظ معلومات اللعبة
        gameRef.set({
            host: userId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            maxPlayers: maxPlayers,
            status: 'waiting',
            players: {
                [userId]: {
                    name: playerName,
                    isHost: true,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                }
            }
        });

        // تخزين معلومات اللاعب والغرفة في التخزين المحلي
        const gameData = {
            gameCode,
            host: true,
            playerName,
            maxPlayers,
            userId
        };
        localStorage.setItem('mafia_game_data', JSON.stringify(gameData));

        // الاستماع إلى تغييرات اللاعبين
        listenToPlayersChanges(gameCode, maxPlayers);

        // نسخ رمز اللعبة إلى الحافظة
        copyCodeBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(gameCode)
                .then(() => {
                    alert('تم نسخ الرمز!');
                })
                .catch(err => {
                    console.error('خطأ في نسخ الرمز: ', err);
                });
        });

        // عند الضغط على زر بدء اللعبة
        startGameBtn.addEventListener('click', () => {
            // تحديث حالة اللعبة إلى "بدأت"
            gameRef.child('status').set('started');
            
            // توزيع الأدوار على اللاعبين
            gameRef.child('players').once('value', (snapshot) => {
                const players = snapshot.val() || {};
                const playerIds = Object.keys(players);
                
                // تحديد عدد اللاعبين في كل دور
                const totalPlayers = playerIds.length;
                const mafiaCount = Math.max(1, Math.floor(totalPlayers / 4));
                const detectiveCount = 1;
                const doctorCount = 1;
                const citizenCount = totalPlayers - mafiaCount - detectiveCount - doctorCount;
                
                // إنشاء مصفوفة الأدوار
                let roles = [];
                for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
                for (let i = 0; i < detectiveCount; i++) roles.push('detective');
                for (let i = 0; i < doctorCount; i++) roles.push('doctor');
                for (let i = 0; i < citizenCount; i++) roles.push('citizen');
                
                // خلط الأدوار
                roles = shuffleArray(roles);
                
                // تعيين الأدوار للاعبين
                const updates = {};
                playerIds.forEach((playerId, index) => {
                    updates[`${playerId}/role`] = roles[index];
                });
                
                // حفظ الأدوار في Firebase
                gameRef.child('players').update(updates);
            });
            
            // الانتقال إلى صفحة اللعب
            window.location.href = 'game.html';
        });
    });

    // دالة لخلط المصفوفة
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}); 