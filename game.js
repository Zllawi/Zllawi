document.addEventListener('DOMContentLoaded', () => {
    // عناصر واجهة المستخدم
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    const playerCountDisplay = document.getElementById('playerCountDisplay');
    const totalPlayersDisplay = document.getElementById('totalPlayersDisplay');
    const gamePhase = document.getElementById('gamePhase');
    const timeRemaining = document.getElementById('timeRemaining');
    const playerRole = document.getElementById('playerRole');
    const roleDescription = document.getElementById('roleDescription');
    const playersGrid = document.getElementById('playersGrid');
    const dayActions = document.getElementById('dayActions');
    const nightActions = document.getElementById('nightActions');
    const waitingMessage = document.getElementById('waitingMessage');
    const voteSelect = document.getElementById('voteSelect');
    const voteBtn = document.getElementById('voteBtn');
    const nightActionSelect = document.getElementById('nightActionSelect');
    const nightActionBtn = document.getElementById('nightActionBtn');
    const nightActionText = document.getElementById('nightActionText');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendMessage = document.getElementById('sendMessage');
    const gameLog = document.getElementById('gameLog');
    const gameOverModal = document.getElementById('gameOverModal');
    const winnerAnnouncement = document.getElementById('winnerAnnouncement');
    const gameResults = document.getElementById('gameResults');
    const backToHomeBtn = document.getElementById('backToHomeBtn');

    // الحصول على بيانات اللعبة من التخزين المحلي
    const localGameData = JSON.parse(localStorage.getItem('mafia_game_data'));
    if (!localGameData) {
        alert('لم يتم العثور على بيانات اللعبة! سيتم توجيهك إلى الصفحة الرئيسية.');
        window.location.href = 'index.html';
        return;
    }

    // تعريف أدوار اللعبة
    const roles = {
        mafia: { name: 'مافيا', description: 'هدفك القضاء على المواطنين. تستيقظ ليلاً لاختيار ضحية.' },
        detective: { name: 'محقق', description: 'هدفك العثور على المافيا. يمكنك التحقق من هوية لاعب واحد كل ليلة.' },
        doctor: { name: 'طبيب', description: 'هدفك حماية المواطنين. يمكنك حماية لاعب واحد كل ليلة من هجوم المافيا.' },
        citizen: { name: 'مواطن', description: 'هدفك التصويت ضد المافيا أثناء النهار للقضاء عليهم.' }
    };

    // المراجع إلى Firebase
    const gameRef = database.ref(`games/${localGameData.gameCode}`);
    const playersRef = gameRef.child('players');
    const chatRef = gameRef.child('chat');
    const votesRef = gameRef.child('votes');
    const nightActionsRef = gameRef.child('nightActions');
    const logRef = gameRef.child('log');
    const gameStateRef = gameRef.child('gameState');

    // حالات اللعبة المحلية
    let localGameState = {
        currentPlayerRole: null,
        players: {},
        alivePlayers: [],
        isHost: localGameData.host
    };

    // تحديث معلومات الدور بناءً على البيانات من Firebase
    function updateRoleInfo() {
        playersRef.child(userId).child('role').once('value', (snapshot) => {
            const roleId = snapshot.val();
            if (roleId && roles[roleId]) {
                localGameState.currentPlayerRole = { id: roleId, ...roles[roleId] };
                playerRole.textContent = localGameState.currentPlayerRole.name;
                roleDescription.textContent = localGameState.currentPlayerRole.description;
            }
        });
    }

    // عرض اللاعبين في الواجهة
    function renderPlayers(players) {
        playersGrid.innerHTML = '';
        voteSelect.innerHTML = '<option value="">-- اختر لاعب --</option>';
        nightActionSelect.innerHTML = '<option value="">-- اختر لاعب --</option>';
        
        const alivePlayerIds = [];
        
        Object.entries(players).forEach(([playerId, playerData]) => {
            if (playerData.isAlive !== false) { // اللاعب حي ما لم يُحدد صراحةً أنه ميت
                alivePlayerIds.push(playerId);
            }
            
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${playerData.isAlive === false ? 'dead' : ''}`;
            playerCard.dataset.playerId = playerId;
            
            playerCard.innerHTML = `
                <div class="player-name">${playerData.name}</div>
                <div class="player-status">${playerData.isAlive === false ? 'ميت' : 'حي'}</div>
            `;
            
            playersGrid.appendChild(playerCard);
            
            // إضافة اللاعبين الأحياء إلى قوائم التصويت واختيار الليل
            if (playerData.isAlive !== false && playerId !== userId) {
                const voteOption = document.createElement('option');
                voteOption.value = playerId;
                voteOption.textContent = playerData.name;
                voteSelect.appendChild(voteOption);
                
                const nightOption = document.createElement('option');
                nightOption.value = playerId;
                nightOption.textContent = playerData.name;
                nightActionSelect.appendChild(nightOption);
            }
        });
        
        localGameState.alivePlayers = alivePlayerIds;
        
        // تحديث عدد اللاعبين
        playerCountDisplay.textContent = Object.keys(players).length;
        totalPlayersDisplay.textContent = Object.keys(players).length;
    }

    // إضافة رسالة إلى سجل الألعاب
    function addToGameLog(message, saveToFirebase = true) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
        
        if (saveToFirebase) {
            logRef.push({
                message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }

    // عند استقبال رسائل السجل من Firebase
    logRef.on('child_added', (snapshot) => {
        const logData = snapshot.val();
        if (logData && logData.message) {
            addToGameLog(logData.message, false);
        }
    });

    // إضافة رسالة دردشة
    function addChatMessage(sender, message, saveToFirebase = true) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <span class="sender">${sender}:</span>
            <span class="message-text">${message}</span>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        if (saveToFirebase) {
            chatRef.push({
                sender,
                message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }

    // عند استقبال رسائل الدردشة من Firebase
    chatRef.on('child_added', (snapshot) => {
        const chatData = snapshot.val();
        if (chatData && chatData.sender && chatData.message) {
            addChatMessage(chatData.sender, chatData.message, false);
        }
    });

    // بدء اللعبة (للمضيف فقط)
    function startGame() {
        if (!localGameState.isHost) return;
        
        // تحديث حالة اللعبة
        gameStateRef.update({
            phase: 'day',
            turn: 1,
            timer: 120,
            startedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // إضافة إلى السجل
        addToGameLog('بدأت اللعبة! اليوم الأول، ناقشوا من تشكون بأنه مافيا.');
    }

    // مراقبة تغييرات حالة اللعبة
    gameStateRef.on('value', (snapshot) => {
        const gameState = snapshot.val() || {};
        
        // تحديث مرحلة اللعبة
        if (gameState.phase) {
            const phaseText = gameState.phase === 'day' ? 'نهار' : gameState.phase === 'night' ? 'ليل' : 'انتظار';
            gamePhase.textContent = phaseText;
            
            // تحديث واجهة المستخدم بناءً على المرحلة
            if (gameState.phase === 'waiting') {
                waitingMessage.style.display = 'block';
                dayActions.style.display = 'none';
                nightActions.style.display = 'none';
            } else if (gameState.phase === 'day') {
                waitingMessage.style.display = 'none';
                dayActions.style.display = 'block';
                nightActions.style.display = 'none';
                
                // إعادة تمكين زر التصويت في بداية كل يوم
                voteBtn.disabled = false;
                voteSelect.disabled = false;
            } else if (gameState.phase === 'night') {
                waitingMessage.style.display = 'none';
                dayActions.style.display = 'none';
                
                // عرض إجراءات الليل المناسبة لدور اللاعب
                if (localGameState.currentPlayerRole && localGameState.currentPlayerRole.id !== 'citizen') {
                    nightActions.style.display = 'block';
                    
                    // تخصيص نص إجراء الليل حسب الدور
                    if (localGameState.currentPlayerRole.id === 'mafia') {
                        nightActionText.textContent = 'اختر ضحية للقتل:';
                    } else if (localGameState.currentPlayerRole.id === 'detective') {
                        nightActionText.textContent = 'اختر لاعباً للتحقق من هويته:';
                    } else if (localGameState.currentPlayerRole.id === 'doctor') {
                        nightActionText.textContent = 'اختر لاعباً لحمايته:';
                    }
                    
                    // إعادة تمكين زر الليل في بداية كل ليلة
                    nightActionBtn.disabled = false;
                    nightActionSelect.disabled = false;
                } else {
                    addToGameLog('أنت مواطن، استرح خلال الليل.');
                }
            } else if (gameState.phase === 'gameOver') {
                showGameResults(gameState.winner);
            }
        }
        
        // تحديث المؤقت
        if (gameState.timer !== undefined) {
            updateTimerDisplay(gameState.timer);
        }
    });

    // مراقبة تغييرات اللاعبين
    playersRef.on('value', (snapshot) => {
        const players = snapshot.val() || {};
        localGameState.players = players;
        renderPlayers(players);
        
        // بدء اللعبة إذا كان مضيفًا وكان هناك ما يكفي من اللاعبين
        if (localGameState.isHost && Object.keys(players).length >= 3 && !gameStateStarted) {
            let gameStateStarted = false;
            
            gameStateRef.once('value', (stateSnapshot) => {
                const state = stateSnapshot.val();
                if (!state || state.phase === 'waiting') {
                    gameStateStarted = true;
                    setTimeout(startGame, 3000);
                }
            });
        }
        
        // تحديث معلومات الدور
        updateRoleInfo();
    });

    // تحديث عرض المؤقت
    function updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timeRemaining.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // إظهار نتائج اللعبة
    function showGameResults(winner) {
        // عرض النتيجة
        const winnerText = winner === 'mafia' ? 'المافيا' : 'المواطنون';
        winnerAnnouncement.textContent = `انتهت اللعبة! ${winnerText} فازوا!`;
        
        // عرض نتائج اللعبة ودور كل لاعب
        gameResults.innerHTML = '';
        
        Object.entries(localGameState.players).forEach(([playerId, playerData]) => {
            if (playerData.role) {
                const roleName = roles[playerData.role]?.name || playerData.role;
                const playerResult = document.createElement('div');
                playerResult.className = 'player-result';
                playerResult.innerHTML = `
                    <span class="player-name">${playerData.name}</span>: 
                    <span class="player-role">${roleName}</span>
                    ${playerData.isAlive === false ? ' (ميت)' : ' (حي)'}
                `;
                gameResults.appendChild(playerResult);
            }
        });
        
        // عرض نافذة النتائج
        gameOverModal.style.display = 'flex';
    }

    // إرسال تصويت
    voteBtn.addEventListener('click', () => {
        const selectedPlayer = voteSelect.value;
        if (selectedPlayer) {
            const playerName = localGameState.players[selectedPlayer]?.name;
            
            if (playerName) {
                // حفظ التصويت في Firebase
                votesRef.child(userId).set({
                    target: selectedPlayer,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                
                addToGameLog(`صوّت ${localGameData.playerName} ضد ${playerName}.`);
                voteBtn.disabled = true;
                voteSelect.disabled = true;
            }
        }
    });

    // إرسال إجراء الليل
    nightActionBtn.addEventListener('click', () => {
        const selectedPlayer = nightActionSelect.value;
        if (selectedPlayer && localGameState.currentPlayerRole) {
            const playerName = localGameState.players[selectedPlayer]?.name;
            
            if (playerName) {
                // حفظ إجراء الليل في Firebase
                nightActionsRef.child(userId).set({
                    role: localGameState.currentPlayerRole.id,
                    target: selectedPlayer,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                
                if (localGameState.currentPlayerRole.id === 'mafia') {
                    addToGameLog(`اختار ${localGameData.playerName} قتل ${playerName}.`);
                } else if (localGameState.currentPlayerRole.id === 'detective') {
                    // كشف هوية اللاعب المستهدف
                    const targetRole = localGameState.players[selectedPlayer]?.role;
                    const isMafia = targetRole === 'mafia';
                    addToGameLog(`اكتشفت أن ${playerName} ${isMafia ? 'مافيا!' : 'ليس مافيا.'}`);
                } else if (localGameState.currentPlayerRole.id === 'doctor') {
                    addToGameLog(`اختار ${localGameData.playerName} حماية ${playerName}.`);
                }
                
                nightActionBtn.disabled = true;
                nightActionSelect.disabled = true;
            }
        }
    });

    // إرسال رسالة دردشة
    sendMessage.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            addChatMessage(localGameData.playerName, message);
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage.click();
        }
    });

    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // تحديث اللعبة للمضيف
    if (localGameState.isHost) {
        // تحديث المؤقت بشكل دوري
        setInterval(() => {
            gameStateRef.once('value', (snapshot) => {
                const gameState = snapshot.val() || {};
                
                if (gameState.phase === 'day' || gameState.phase === 'night') {
                    let timer = gameState.timer || 0;
                    
                    if (timer > 0) {
                        // تحديث المؤقت
                        gameStateRef.update({ timer: timer - 1 });
                    } else {
                        // انتهى الوقت، انتقل إلى المرحلة التالية
                        if (gameState.phase === 'day') {
                            endDayPhase();
                        } else if (gameState.phase === 'night') {
                            endNightPhase();
                        }
                    }
                }
            });
        }, 1000);
        
        // إنهاء مرحلة النهار
        function endDayPhase() {
            addToGameLog('انتهى الوقت! الليل يحل على المدينة.');
            
            // جمع الأصوات وتنفيذ نتائج التصويت
            votesRef.once('value', (snapshot) => {
                const votes = snapshot.val() || {};
                executeDayVote(votes);
                
                // التحقق من انتهاء اللعبة
                if (checkGameEnd()) return;
                
                // الانتقال إلى مرحلة الليل
                gameStateRef.update({
                    phase: 'night',
                    timer: 60
                });
                
                // مسح الأصوات استعداداً لليوم التالي
                votesRef.remove();
            });
        }
        
        // تنفيذ نتائج التصويت
        function executeDayVote(votes) {
            const voteCounts = {};
            
            // احتساب عدد الأصوات لكل لاعب
            Object.values(votes).forEach(vote => {
                if (vote.target) {
                    voteCounts[vote.target] = (voteCounts[vote.target] || 0) + 1;
                }
            });
            
            // تحديد اللاعب ذو أكثر الأصوات
            let maxVotes = 0;
            let eliminatedPlayerId = null;
            
            Object.entries(voteCounts).forEach(([playerId, count]) => {
                if (count > maxVotes) {
                    maxVotes = count;
                    eliminatedPlayerId = playerId;
                }
            });
            
            // إذا لم يكن هناك أصوات، اختر لاعب عشوائي
            if (!eliminatedPlayerId && localGameState.alivePlayers.length > 0) {
                const randomIndex = Math.floor(Math.random() * localGameState.alivePlayers.length);
                eliminatedPlayerId = localGameState.alivePlayers[randomIndex];
            }
            
            if (eliminatedPlayerId) {
                // تحديث حالة اللاعب
                playersRef.child(eliminatedPlayerId).update({
                    isAlive: false
                });
                
                // إضافة إلى السجل
                const playerName = localGameState.players[eliminatedPlayerId]?.name || 'اللاعب';
                addToGameLog(`تم إعدام ${playerName} بتصويت المدينة.`);
            }
        }
        
        // إنهاء مرحلة الليل
        function endNightPhase() {
            addToGameLog('ينتهي الليل! بدأ يوم جديد.');
            
            // تنفيذ إجراءات الليل
            nightActionsRef.once('value', (snapshot) => {
                const nightActions = snapshot.val() || {};
                executeNightActions(nightActions);
                
                // التحقق من انتهاء اللعبة
                if (checkGameEnd()) return;
                
                // الانتقال إلى مرحلة النهار
                gameStateRef.update({
                    phase: 'day',
                    timer: 120,
                    turn: (gameStateRef.turn || 1) + 1
                });
                
                // مسح إجراءات الليل استعداداً لليلة التالية
                nightActionsRef.remove();
            });
        }
        
        // تنفيذ إجراءات الليل
        function executeNightActions(nightActions) {
            let mafiaTarget = null;
            let doctorTarget = null;
            
            // تحديد هدف المافيا وهدف الطبيب
            Object.entries(nightActions).forEach(([playerId, action]) => {
                if (action.role === 'mafia') {
                    mafiaTarget = action.target;
                } else if (action.role === 'doctor') {
                    doctorTarget = action.target;
                }
            });
            
            // إذا لم يكن هناك هدف للمافيا، اختر لاعب عشوائي
            if (!mafiaTarget && localGameState.alivePlayers.length > 0) {
                const randomIndex = Math.floor(Math.random() * localGameState.alivePlayers.length);
                mafiaTarget = localGameState.alivePlayers[randomIndex];
            }
            
            // التحقق مما إذا كان الطبيب قد حمى الهدف
            if (mafiaTarget && mafiaTarget === doctorTarget) {
                // تم حماية الهدف
                addToGameLog('استيقظت المدينة في أمان، لم يتم العثور على ضحايا.');
            } else if (mafiaTarget) {
                // تم قتل الهدف
                playersRef.child(mafiaTarget).update({
                    isAlive: false
                });
                
                // إضافة إلى السجل
                const playerName = localGameState.players[mafiaTarget]?.name || 'اللاعب';
                addToGameLog(`تم العثور على ${playerName} مقتولاً!`);
            }
        }
        
        // التحقق من انتهاء اللعبة
        function checkGameEnd() {
            // عد المافيا والمواطنين الأحياء
            let aliveMafia = 0;
            let aliveCitizens = 0;
            
            Object.entries(localGameState.players).forEach(([playerId, playerData]) => {
                if (playerData.isAlive !== false) {
                    if (playerData.role === 'mafia') {
                        aliveMafia++;
                    } else {
                        aliveCitizens++;
                    }
                }
            });
            
            if (aliveMafia === 0) {
                // فوز المواطنين
                gameStateRef.update({
                    phase: 'gameOver',
                    winner: 'citizens'
                });
                
                addToGameLog('انتهت اللعبة! المواطنون فازوا!');
                return true;
            } else if (aliveMafia >= aliveCitizens) {
                // فوز المافيا
                gameStateRef.update({
                    phase: 'gameOver',
                    winner: 'mafia'
                });
                
                addToGameLog('انتهت اللعبة! المافيا فازت!');
                return true;
            }
            
            return false;
        }
    }

    // عرض رمز الغرفة
    roomCodeDisplay.textContent = localGameData.gameCode;
}); 