document.addEventListener('DOMContentLoaded', () => {
    const createGameBtn = document.querySelector('.primary-btn');
    const joinGameBtn = document.querySelector('.secondary-btn');

    createGameBtn.addEventListener('click', () => {
        // التوجيه إلى صفحة إنشاء لعبة جديدة
        window.location.href = 'create-game.html';
    });

    joinGameBtn.addEventListener('click', () => {
        // التوجيه إلى صفحة الانضمام إلى لعبة
        window.location.href = 'join-game.html';
    });
}); 