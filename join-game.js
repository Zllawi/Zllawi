document.addEventListener('DOMContentLoaded', () => {
    const playerNameInput = document.getElementById('playerName');
    const gameCodeInput = document.getElementById('gameCodeInput');
    const joinGameBtn = document.getElementById('joinGameBtn');
    const setupForm = document.querySelector('.setup-form');
    const waitingRoom = document.querySelector('.waiting-room');
    const roomCodeElement = document.getElementById('roomCode');
    const playersListElement = document.getElementById('playersList');

    // عرض قائمة اللاعبين من Firebase
    function renderPlayersList(players) {
        playersListElement.innerHTML = '';
        
        Object.entries(players).forEach(([playerId, playerData]) => {
            const li = document.createElement('li');
            li.textContent = playerData.name + (playerData.isHost ? ' (المضيف)' : '');
            playersListElement.appendChild(li);
        });
    }

    // الاستماع إلى تغييرات اللعبة
    function listenToGameChanges(gameCode) {
        const gameRef = database.ref(`games/${gameCode}`);
        
        // الاستماع إلى تغييرات اللاعبين
        gameRef.child('players').on('value', (snapshot) => {
            const players = snapshot.val() || {};
            renderPlayersList(players);
        });
        
        // الاستماع إلى تغيير حالة اللعبة
        gameRef.child('status').on('value', (snapshot) => {
            const status = snapshot.val();
            if (status === 'started') {
                // إذا بدأت اللعبة، انتقل إلى صفحة اللعب
                window.location.href = 'game.html';
            }
        });
    }

    joinGameBtn.addEventListener('click', () => {
        // التحقق من إدخال اسم اللاعب ورمز اللعبة
        const playerName = playerNameInput.value.trim();
        const gameCode = gameCodeInput.value.trim().toUpperCase();

        if (!playerName) {
            alert('الرجاء إدخال اسمك');
            return;
        }

        if (!gameCode || gameCode.length !== 4) {
            alert('الرجاء إدخال رمز لعبة صحيح (4 أحرف)');
            return;
        }

        // التحقق من وجود اللعبة في Firebase
        const gameRef = database.ref(`games/${gameCode}`);
        gameRef.once('value', (snapshot) => {
            const gameData = snapshot.val();
            
            if (!gameData) {
                alert('لم يتم العثور على لعبة بهذا الرمز!');
                return;
            }
            
            if (gameData.status === 'started') {
                alert('اللعبة قد بدأت بالفعل!');
                return;
            }
            
            // التحقق من عدد اللاعبين
            const players = gameData.players || {};
            if (Object.keys(players).length >= gameData.maxPlayers) {
                alert('اللعبة ممتلئة بالفعل!');
                return;
            }
            
            // إضافة اللاعب إلى اللعبة
            gameRef.child('players').update({
                [userId]: {
                    name: playerName,
                    isHost: false,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                }
            });
            
            // تخزين معلومات اللاعب والغرفة في التخزين المحلي
            const localGameData = {
                gameCode,
                host: false,
                playerName,
                userId
            };
            localStorage.setItem('mafia_game_data', JSON.stringify(localGameData));
            
            // إخفاء نموذج الانضمام وإظهار غرفة الانتظار
            setupForm.style.display = 'none';
            waitingRoom.style.display = 'block';
            
            // عرض رمز الغرفة
            roomCodeElement.textContent = gameCode;
            
            // الاستماع إلى تغييرات اللعبة
            listenToGameChanges(gameCode);
        });
    });
}); 