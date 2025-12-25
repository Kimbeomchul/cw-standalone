// 게임 상태
let gameState = {
    coins: 0,
    perClick: 1,
    perSecond: 0,
    items: [],
    boosterActive: false,
    boosterEndTime: 0,
    boosterLastUsedTime: 0, // 부스터 마지막 사용 시간 (10분 쿨다운)
    selectedTree: 'image.png', // 선택된 나무 이미지
    selectedClickImage: 'pop.png', // 선택된 클릭 이미지
    ownedTrees: ['image.png'], // 보유한 나무 이미지
    ownedClickImages: ['pop.png'], // 보유한 클릭 이미지
    lastSaveTime: Date.now() // 마지막 저장 시간 (오프라인 수익 계산용)
};

// 부스터 상태
let boosterMultiplier = 1;
let activeTouches = new Set(); // 활성 터치 ID 추적 (멀티터치 지원)
let clickHandlersAttached = false; // 이벤트 리스너 중복 방지
const BOOSTER_COOLDOWN = 10 * 60 * 1000; // 10분 (밀리초)

// 숫자 포맷팅 헬퍼 (간단한 버전)
function formatNumberSimple(num) {
    return formatKoreanMoney(num);
}

// 한국 돈 형식 포맷팅 (1원 단위까지 표시)
function formatKoreanMoney(num) {
    const numValue = Math.floor(num);
    const decimal = num - numValue;
    
    // 1원 단위까지 표시하는 헬퍼 함수
    function formatWithDecimal(value, unit) {
        if (value < 10000) {
            // 1만원 미만은 1원 단위까지 표시
            if (decimal > 0) {
                const decimalStr = decimal.toFixed(2).split('.')[1];
                return `${value.toLocaleString()}.${decimalStr}${unit}`;
            }
            return `${value.toLocaleString()}${unit}`;
        } else {
            // 1만원 이상도 1원 단위 표시
            const remainder = value % 10000;
            if (remainder > 0 || decimal > 0) {
                const totalRemainder = remainder + decimal;
                if (totalRemainder >= 1) {
                    return `${Math.floor(value / 10000)}만 ${Math.floor(totalRemainder).toLocaleString()}${unit}`;
                }
            }
            return `${Math.floor(value / 10000)}만${unit}`;
        }
    }
    
    if (numValue >= 10000000000000000000000) { // 경
        const kyung = Math.floor(numValue / 10000000000000000000000);
        const remainder = numValue % 10000000000000000000000;
        if (remainder >= 1000000000000000000000) {
            const jo = Math.floor(remainder / 1000000000000000000000);
            return `${kyung}경 ${jo}조원`;
        }
        return `${kyung}경원`;
    } else if (numValue >= 1000000000000000000000) { // 조
        const jo = Math.floor(numValue / 1000000000000000000000);
        const remainder = numValue % 1000000000000000000000;
        if (remainder >= 100000000000000000000) {
            const eok = Math.floor(remainder / 100000000000000000000);
            return `${jo}조 ${eok}억원`;
        }
        return `${jo}조원`;
    } else if (numValue >= 100000000) { // 억
        const eok = Math.floor(numValue / 100000000);
        const remainder = numValue % 100000000;
        const remainderWithDecimal = remainder + decimal;
        
        if (remainder >= 10000000) {
            const chunman = Math.floor(remainder / 10000000);
            const manRemainder = remainder % 10000000;
            if (manRemainder > 0 || (remainder < 10000000 && decimal > 0)) {
                return `${eok}억 ${chunman}천만 ${Math.floor(remainderWithDecimal % 10000000).toLocaleString()}원`;
            }
            return `${eok}억 ${chunman}천만원`;
        } else if (remainder >= 1000000) {
            const baekman = Math.floor(remainder / 1000000);
            const manRemainder = remainder % 1000000;
            if (manRemainder > 0 || decimal > 0) {
                return `${eok}억 ${baekman}백만 ${Math.floor(remainderWithDecimal % 1000000).toLocaleString()}원`;
            }
            return `${eok}억 ${baekman}백만원`;
        } else if (remainder >= 100000) {
            const sipman = Math.floor(remainder / 100000);
            const manRemainder = remainder % 100000;
            if (manRemainder > 0 || decimal > 0) {
                return `${eok}억 ${sipman * 10}만 ${Math.floor(remainderWithDecimal % 100000).toLocaleString()}원`;
            }
            return `${eok}억 ${sipman * 10}만원`;
        } else if (remainder >= 10000) {
            const man = Math.floor(remainder / 10000);
            const wonRemainder = remainder % 10000;
            if (wonRemainder > 0 || decimal > 0) {
                return `${eok}억 ${man}만 ${Math.floor(remainderWithDecimal % 10000).toLocaleString()}원`;
            }
            return `${eok}억 ${man}만원`;
        } else if (remainder > 0 || decimal > 0) {
            return `${eok}억 ${Math.floor(remainderWithDecimal).toLocaleString()}원`;
        }
        return `${eok}억원`;
    } else if (numValue >= 10000000) { // 천만
        return formatWithDecimal(numValue, '원');
    } else if (numValue >= 1000000) { // 백만
        return formatWithDecimal(numValue, '원');
    } else if (numValue >= 100000) { // 십만
        return formatWithDecimal(numValue, '원');
    } else if (numValue >= 10000) { // 만
        return formatWithDecimal(numValue, '원');
    } else {
        // 1만원 미만은 1원 단위까지 표시
        if (decimal > 0) {
            const decimalStr = decimal.toFixed(2).split('.')[1];
            return `${numValue.toLocaleString()}.${decimalStr}원`;
        }
        return `${numValue.toLocaleString()}원`;
    }
}

// 숫자 애니메이션 (쮸르르륵 올라가는 효과 + 폰트 크기 자동 조정)
function animateNumber(element, targetValue, currentValue) {
    const duration = 300;
    const startTime = Date.now();
    const startValue = currentValue;
    const difference = targetValue - startValue;
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (difference * easeOut);
        
        const formatted = formatKoreanMoney(current);
        element.textContent = formatted;
        adjustFontSize(element, formatted);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            const finalFormatted = formatKoreanMoney(targetValue);
            element.textContent = finalFormatted;
            adjustFontSize(element, finalFormatted);
        }
    }
    
    update();
}

// 폰트 크기 자동 조정
function adjustFontSize(element, text) {
    element.classList.remove('long', 'very-long');
    
    // 텍스트 길이에 따라 폰트 크기 조정
    if (text.length > 15) {
        element.classList.add('very-long');
    } else if (text.length > 10) {
        element.classList.add('long');
    }
}

// 상점 아이템 생성 함수
function generateShopItems() {
    const items = [];
    const icons = ['💰', '💎', '👑', '💍', '🌟', '⚡', '🔥', '💫', '🎯', '🏆', '🎪', '🎨', '🎭', '🎬', '🎮', '🎲', '🎰', '🎁', '🎊', '🎉'];
    const autoIcons = ['🤖', '🏭', '⚙️', '🔧', '🛠️', '⚡', '🚀', '🛸', '🌌', '🌟', '💫', '✨', '🔮', '🎪', '🎨', '🎭', '🎬', '🎮', '🎲', '🎰'];
    
    // 1-20: 기본 난이도
    for (let i = 0; i < 20; i++) {
        const level = Math.floor(i / 2) + 1;
        const isClick = i % 2 === 0;
        const baseValue = Math.pow(5, level - 1);
        const basePrice = isClick ? baseValue * 10 : baseValue * 50;
        
        items.push({
            id: `item${i + 1}`,
            name: `${isClick ? icons[i % icons.length] : autoIcons[i % autoIcons.length]} ${isClick ? '클릭' : '자동'} Lv.${level}`,
            description: isClick ? `클릭당 수익 +${formatNumberSimple(baseValue)}` : `초당 +${formatNumberSimple(baseValue)} 코인`,
            basePrice: basePrice,
            priceMultiplier: 1.5,
            effect: isClick ? 'click' : 'auto',
            value: baseValue
        });
    }
    
    // 21-30: 어려운 난이도
    for (let i = 20; i < 30; i++) {
        const level = Math.floor(i / 2) + 1;
        const isClick = i % 2 === 0;
        const baseValue = Math.pow(10, level - 10) * 100;
        const basePrice = isClick ? baseValue * 20 : baseValue * 100;
        
        items.push({
            id: `item${i + 1}`,
            name: `${isClick ? icons[i % icons.length] : autoIcons[i % autoIcons.length]} ${isClick ? '프리미엄 클릭' : '프리미엄 자동'} Lv.${level}`,
            description: isClick ? `클릭당 수익 +${formatNumberSimple(baseValue)}` : `초당 +${formatNumberSimple(baseValue)} 코인`,
            basePrice: basePrice,
            priceMultiplier: 2.0,
            effect: isClick ? 'click' : 'auto',
            value: baseValue
        });
    }
    
    // 31-40: 매우 어려운 난이도
    for (let i = 30; i < 40; i++) {
        const level = Math.floor(i / 2) + 1;
        const isClick = i % 2 === 0;
        const baseValue = Math.pow(20, level - 15) * 1000;
        const basePrice = isClick ? baseValue * 50 : baseValue * 250;
        
        items.push({
            id: `item${i + 1}`,
            name: `${isClick ? icons[i % icons.length] : autoIcons[i % autoIcons.length]} ${isClick ? '레전드 클릭' : '레전드 자동'} Lv.${level}`,
            description: isClick ? `클릭당 수익 +${formatNumberSimple(baseValue)}` : `초당 +${formatNumberSimple(baseValue)} 코인`,
            basePrice: basePrice,
            priceMultiplier: 3.0,
            effect: isClick ? 'click' : 'auto',
            value: baseValue
        });
    }
    
    return items;
}

const shopItems = generateShopItems();

// 초기화
function init() {
    loadGame(); // localStorage에서 로드 (오프라인 수익 계산 포함)
    renderShop();
    updateUI();
    startAutoIncome();
    setupClickArea();
    setupShopModal();
    setupInfoModal();
    setupPurchaseModal();
    setupBooster();
    checkBoosterStatus();
    startBoosterTimer();
    
    // 초기 부스터 UI 업데이트
    setTimeout(() => {
        updateBoosterUI();
        // 초기 폰트 크기 조정
        const coinsElement = document.getElementById('coins');
        const perSecondElement = document.getElementById('perSecond');
        const perClickElement = document.getElementById('perClick');
        if (coinsElement) adjustFontSize(coinsElement, coinsElement.textContent);
        if (perSecondElement) adjustFontSize(perSecondElement, perSecondElement.textContent);
        if (perClickElement) adjustFontSize(perClickElement, perClickElement.textContent);
    }, 100);
}

// 클릭 영역 설정 (멀티터치 지원)
function setupClickArea() {
    if (clickHandlersAttached) return; // 이미 등록된 경우 무시
    
    const clickArea = document.getElementById('clickArea');
    if (!clickArea) return;
    
    // 기존 이벤트 리스너 제거 후 재등록
    clickArea.removeEventListener('click', handleClick);
    clickArea.removeEventListener('touchstart', handleTouch);
    clickArea.removeEventListener('touchend', handleTouchEnd);
    clickArea.removeEventListener('touchcancel', handleTouchCancel);
    
    clickArea.addEventListener('click', handleClick, { once: false, passive: false });
    clickArea.addEventListener('touchstart', handleTouch, { once: false, passive: false });
    clickArea.addEventListener('touchend', handleTouchEnd, { once: false, passive: false });
    clickArea.addEventListener('touchcancel', handleTouchCancel, { once: false, passive: false });
    
    clickHandlersAttached = true;
}

// 상점 모달 설정
function setupShopModal() {
    const shopButton = document.getElementById('shopButton');
    const shopModal = document.getElementById('shopModal');
    const closeButton = document.getElementById('closeShop');
    
    if (shopButton) {
        shopButton.addEventListener('click', () => {
            shopModal.classList.add('show');
            renderShop();
            renderCustomizeShop();
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            shopModal.classList.remove('show');
        });
    }
    
    if (shopModal) {
        shopModal.addEventListener('click', (e) => {
            if (e.target === shopModal) {
                shopModal.classList.remove('show');
            }
        });
    }
    
    // 탭 전환
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // 탭 활성화
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 컨텐츠 전환
            document.querySelectorAll('.shop-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            if (tabName === 'items') {
                document.getElementById('itemsTab').classList.add('active');
            } else if (tabName === 'customize') {
                document.getElementById('customizeTab').classList.add('active');
                renderCustomizeShop();
            }
        });
    });
}

// 정보 모달 설정
function setupInfoModal() {
    const infoButtonMain = document.getElementById('infoButtonMain');
    const infoModal = document.getElementById('infoModal');
    const closeInfo = document.getElementById('closeInfo');
    
    if (infoButtonMain) {
        infoButtonMain.addEventListener('click', () => {
            infoModal.classList.add('show');
        });
    }
    
    if (closeInfo) {
        closeInfo.addEventListener('click', () => {
            infoModal.classList.remove('show');
        });
    }
    
    if (infoModal) {
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                infoModal.classList.remove('show');
            }
        });
    }
}

// 구매 확인 팝업 설정
let purchaseCallback = null;

function setupPurchaseModal() {
    const purchaseModal = document.getElementById('purchaseModal');
    const purchaseConfirm = document.getElementById('purchaseConfirm');
    const purchaseCancel = document.getElementById('purchaseCancel');
    
    if (purchaseConfirm) {
        purchaseConfirm.addEventListener('click', () => {
            if (purchaseCallback) {
                purchaseCallback();
                purchaseCallback = null;
            }
            purchaseModal.classList.remove('show');
        });
    }
    
    if (purchaseCancel) {
        purchaseCancel.addEventListener('click', () => {
            purchaseCallback = null;
            purchaseModal.classList.remove('show');
        });
    }
    
    if (purchaseModal) {
        purchaseModal.addEventListener('click', (e) => {
            if (e.target === purchaseModal) {
                purchaseCallback = null;
                purchaseModal.classList.remove('show');
            }
        });
    }
}

// 구매 확인 팝업 표시
function showPurchaseConfirm(message, callback) {
    const purchaseModal = document.getElementById('purchaseModal');
    const purchaseMessage = document.getElementById('purchaseMessage');
    
    if (purchaseModal && purchaseMessage) {
        purchaseMessage.textContent = message;
        purchaseCallback = callback;
        purchaseModal.classList.add('show');
    }
}

// 클릭 처리 (멀티터치 지원)
function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 나무 뽀잉뽀잉 애니메이션
    const clickArea = document.getElementById('clickArea');
    if (clickArea) {
        clickArea.classList.add('clicked');
        setTimeout(() => {
            clickArea.classList.remove('clicked');
        }, 400);
    }
    
    addCoins(gameState.perClick);
    showPopAnimation(e);
    
    return false;
}

// 터치 처리 (멀티터치 지원 - 여러 손가락 동시 처리)
function handleTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const clickArea = document.getElementById('clickArea');
    if (!clickArea) return false;
    
    const rect = clickArea.getBoundingClientRect();
    
    // 모든 활성 터치 처리 (멀티터치 지원)
    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const touchId = touch.identifier;
        
        // 이미 처리 중인 터치는 건너뛰기
        if (activeTouches.has(touchId)) {
            continue;
        }
        
        // 터치 ID 추가
        activeTouches.add(touchId);
        
        // 나무 뽀잉뽀잉 애니메이션 (첫 터치에만)
        if (i === 0) {
            clickArea.classList.add('clicked');
            setTimeout(() => {
                clickArea.classList.remove('clicked');
            }, 400);
        }
        
        // 코인 추가 및 애니메이션
        addCoins(gameState.perClick);
        showPopAnimation({ clientX: touch.clientX, clientY: touch.clientY }, rect);
    }
    
    return false;
}

// 터치 종료 처리
function handleTouchEnd(e) {
    // 종료된 터치 ID 제거
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.delete(touch.identifier);
    }
}

// 터치 취소 처리
function handleTouchCancel(e) {
    // 취소된 터치 ID 제거
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.delete(touch.identifier);
    }
}

// 코인 추가 (애니메이션 포함)
let currentDisplayCoins = 0;

function addCoins(amount) {
    const finalAmount = amount * boosterMultiplier;
    const oldCoins = gameState.coins;
    gameState.coins += finalAmount;
    
    // 숫자 애니메이션
    const coinElement = document.getElementById('coins');
    if (coinElement) {
        animateNumber(coinElement, gameState.coins, oldCoins);
    }
    
    // localStorage에도 저장 (즉시 반영)
    saveGame();
}

// 클릭 애니메이션 (왼쪽/오른쪽 랜덤 포물선)
function showPopAnimation(e, rect = null) {
    const clickArea = document.getElementById('clickArea');
    if (!clickArea) return;
    
    const pop = document.createElement('div');
    pop.className = 'pop-animation';
    
    const img = document.createElement('img');
    img.src = `images/${gameState.selectedClickImage || 'pop.png'}`;
    img.alt = 'click';
    pop.appendChild(img);
    
    let x, y;
    if (rect) {
        const clickRect = clickArea.getBoundingClientRect();
        x = e.clientX - clickRect.left;
        y = e.clientY - clickRect.top;
    } else {
        const clickRect = clickArea.getBoundingClientRect();
        x = e.clientX - clickRect.left;
        y = e.clientY - clickRect.top;
    }
    
    // 왼쪽 또는 오른쪽 랜덤 선택
    const isLeft = Math.random() < 0.5;
    const direction = isLeft ? -1 : 1;
    
    // 완전히 랜덤한 포물선 경로 생성 (왼쪽/오른쪽 모두)
    const randomAngle = (Math.random() - 0.5) * Math.PI * 0.6 * direction; // -54도 ~ +54도, 방향 랜덤
    const randomDistance = 60 + Math.random() * 100; // 60 ~ 160px
    const randomHeight = 80 + Math.random() * 120; // 80 ~ 200px
    
    // 포물선의 여러 지점 계산
    const x1 = Math.cos(randomAngle) * randomDistance * 0.25;
    const y1 = -Math.sin(Math.abs(randomAngle)) * randomHeight * 0.25;
    const x2 = Math.cos(randomAngle) * randomDistance * 0.5;
    const y2 = -Math.sin(Math.abs(randomAngle)) * randomHeight * 0.5;
    const x3 = Math.cos(randomAngle) * randomDistance * 0.75;
    const y3 = -Math.sin(Math.abs(randomAngle)) * randomHeight * 0.75;
    const x4 = Math.cos(randomAngle) * randomDistance;
    const y4 = -Math.sin(Math.abs(randomAngle)) * randomHeight;
    
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
    
    // CSS 변수로 랜덤 경로 설정
    pop.style.setProperty('--random-x1', `${x1}px`);
    pop.style.setProperty('--random-y1', `${y1}px`);
    pop.style.setProperty('--random-x2', `${x2}px`);
    pop.style.setProperty('--random-y2', `${y2}px`);
    pop.style.setProperty('--random-x3', `${x3}px`);
    pop.style.setProperty('--random-y3', `${y3}px`);
    pop.style.setProperty('--random-x4', `${x4}px`);
    pop.style.setProperty('--random-y4', `${y4}px`);
    
    clickArea.appendChild(pop);
    
    requestAnimationFrame(() => {
        pop.classList.add('show');
    });
    
    setTimeout(() => {
        if (pop.parentNode) {
            pop.remove();
        }
    }, 1200);
}

// 자동 수익 시작
function startAutoIncome() {
    setInterval(() => {
        if (gameState.perSecond > 0) {
            addCoins(gameState.perSecond);
        }
    }, 1000);
}

// 부스터 설정
function setupBooster() {
    const boosterButton = document.getElementById('boosterButton');
    if (boosterButton) {
        boosterButton.addEventListener('click', activateBooster);
    }
}

// 부스터 활성화 (10초, 쿨다운 10분)
function activateBooster() {
    const boosterButton = document.getElementById('boosterButton');
    if (!boosterButton) return;
    
    // 쿨다운 체크
    if (gameState.boosterLastUsedTime > 0) {
        const timeSinceLastUse = Date.now() - gameState.boosterLastUsedTime;
        if (timeSinceLastUse < BOOSTER_COOLDOWN) {
            // 아직 쿨다운 중
            return;
        }
    }
    
    // 이미 활성화되어 있으면 무시
    if (gameState.boosterActive) {
        return;
    }
    
    gameState.boosterActive = true;
    gameState.boosterEndTime = Date.now() + (10 * 1000); // 10초
    gameState.boosterLastUsedTime = Date.now(); // 사용 시간 기록
    boosterMultiplier = 2;
    
    boosterButton.classList.add('active');
    boosterButton.classList.remove('cooldown');
    document.body.classList.add('booster-active');
    
    updateUI();
    saveGame();
}

// 부스터 상태 확인
function checkBoosterStatus() {
    if (gameState.boosterActive && Date.now() >= gameState.boosterEndTime) {
        gameState.boosterActive = false;
        boosterMultiplier = 1;
        
        const boosterButton = document.getElementById('boosterButton');
        const timer = document.getElementById('boosterTimer');
        
        if (boosterButton) {
            boosterButton.classList.remove('active');
        }
        document.body.classList.remove('booster-active');
        if (timer) {
            timer.classList.remove('show');
            timer.textContent = '';
        }
        
        updateUI();
        saveGame();
    }
}

// 부스터 타이머 시작
function startBoosterTimer() {
    setInterval(() => {
        checkBoosterStatus();
        updateBoosterUI();
    }, 100);
}

// 부스터 UI 업데이트 (쿨다운 포함)
function updateBoosterUI() {
    const boosterButton = document.getElementById('boosterButton');
    const timer = document.getElementById('boosterTimer');
    const cooldown = document.getElementById('boosterCooldown');
    
    if (!boosterButton) return;
    
    if (gameState.boosterActive) {
        // 활성화 중
        const remaining = Math.ceil((gameState.boosterEndTime - Date.now()) / 1000);
        if (timer) {
            if (remaining > 0) {
                timer.classList.add('show');
                timer.textContent = remaining;
            } else {
                timer.classList.remove('show');
                timer.textContent = '';
            }
        }
        if (cooldown) {
            cooldown.classList.remove('show');
        }
    } else {
        // 쿨다운 체크
        if (gameState.boosterLastUsedTime > 0) {
            const timeSinceLastUse = Date.now() - gameState.boosterLastUsedTime;
            const cooldownRemaining = BOOSTER_COOLDOWN - timeSinceLastUse;
            
            if (cooldownRemaining > 0) {
                // 쿨다운 중
                boosterButton.classList.add('cooldown');
                boosterButton.classList.remove('active');
                
                const minutes = Math.floor(cooldownRemaining / 60000);
                const seconds = Math.floor((cooldownRemaining % 60000) / 1000);
                
                if (cooldown) {
                    cooldown.classList.add('show');
                    if (minutes > 0) {
                        cooldown.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    } else {
                        cooldown.textContent = `${seconds}초`;
                    }
                }
            } else {
                // 쿨다운 완료
                boosterButton.classList.remove('cooldown');
                if (cooldown) {
                    cooldown.classList.remove('show');
                }
            }
        }
        
        if (timer) {
            timer.classList.remove('show');
        }
    }
}

// 상점 렌더링
function renderShop() {
    const shopItemsContainer = document.getElementById('shopItems');
    if (!shopItemsContainer) return;
    
    shopItemsContainer.innerHTML = '';
    
    // 아이템 정렬: 구매 가능한 것 우선, 그 다음 가격순
    const sortedItems = [...shopItems].sort((a, b) => {
        const aCount = getItemCount(a.id);
        const bCount = getItemCount(b.id);
        const aPrice = calculatePrice(a, aCount);
        const bPrice = calculatePrice(b, bCount);
        const aCanBuy = gameState.coins >= aPrice;
        const bCanBuy = gameState.coins >= bPrice;
        
        // 구매 가능한 것 우선
        if (aCanBuy !== bCanBuy) {
            return bCanBuy - aCanBuy;
        }
        // 가격순 정렬
        return aPrice - bPrice;
    });
    
    sortedItems.forEach(item => {
        const itemCount = getItemCount(item.id);
        const price = calculatePrice(item, itemCount);
        
        const shopItem = document.createElement('div');
        shopItem.className = 'shop-item';
        shopItem.classList.toggle('disabled', gameState.coins < price);
        
        shopItem.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-desc">${item.description}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="shop-item-price">${formatKoreanMoney(price)}</span>
                ${itemCount > 0 ? `<span class="shop-item-count">x${itemCount}</span>` : ''}
            </div>
        `;
        
        shopItem.addEventListener('click', () => {
            if (gameState.coins >= price) {
                buyItem(item);
            }
        });
        
        shopItemsContainer.appendChild(shopItem);
    });
}

// 아이템 구매
function buyItem(item) {
    const itemCount = getItemCount(item.id);
    const price = calculatePrice(item, itemCount);
    
    if (gameState.coins >= price) {
        // 바로 구매 (확인 팝업 없음)
        const oldCoins = gameState.coins;
        gameState.coins -= price;
        
        // 숫자 애니메이션
        const coinElement = document.getElementById('coins');
        if (coinElement) {
            animateNumber(coinElement, gameState.coins, oldCoins);
        }
        
        const existingItem = gameState.items.find(i => i.id === item.id);
        if (existingItem) {
            existingItem.count++;
        } else {
            gameState.items.push({
                id: item.id,
                count: 1
            });
        }
        
        // 효과 적용
        if (item.effect === 'click') {
            gameState.perClick += item.value;
        } else if (item.effect === 'auto') {
            gameState.perSecond += item.value;
        }
        
        updateUI();
        renderShop();
        saveGame();
    }
}

// 아이템 개수 가져오기
function getItemCount(itemId) {
    const item = gameState.items.find(i => i.id === itemId);
    return item ? item.count : 0;
}

// 가격 계산
function calculatePrice(item, count) {
    return Math.floor(item.basePrice * Math.pow(item.priceMultiplier, count));
}

// UI 업데이트
function updateUI() {
    // 부스터 적용된 수익 표시
    const perSecondDisplay = gameState.perSecond * boosterMultiplier;
    const perClickDisplay = gameState.perClick * boosterMultiplier;
    
    const perSecondElement = document.getElementById('perSecond');
    const perClickElement = document.getElementById('perClick');
    const coinsElement = document.getElementById('coins');
    
    if (perSecondElement) {
        const formatted = formatKoreanMoney(perSecondDisplay);
        perSecondElement.textContent = formatted;
        adjustFontSize(perSecondElement, formatted);
    }
    if (perClickElement) {
        const formatted = formatKoreanMoney(perClickDisplay);
        perClickElement.textContent = formatted;
        adjustFontSize(perClickElement, formatted);
    }
    if (coinsElement) {
        const formatted = formatKoreanMoney(gameState.coins);
        adjustFontSize(coinsElement, formatted);
    }
    
    // 상점 모달이 열려있으면 상점 아이템 업데이트
    const shopModal = document.getElementById('shopModal');
    if (shopModal && shopModal.classList.contains('show')) {
        const shopItemsContainer = document.getElementById('shopItems');
        const shopItemElements = shopItemsContainer ? shopItemsContainer.querySelectorAll('.shop-item') : [];
        
        shopItems.forEach((item, index) => {
            const itemCount = getItemCount(item.id);
            const price = calculatePrice(item, itemCount);
            const shopItemElement = shopItemElements[index];
            
            if (shopItemElement) {
                shopItemElement.classList.toggle('disabled', gameState.coins < price);
                const priceElement = shopItemElement.querySelector('.shop-item-price');
                if (priceElement) {
                    priceElement.textContent = formatKoreanMoney(price);
                }
            }
        });
        
        // 커스터마이징 아이템도 업데이트
        renderCustomizeShop();
    }
}

// 커스터마이징 상점 렌더링
function renderCustomizeShop() {
    // 나무 이미지 아이템
    const treeItems = [
        { id: 'tree_christmas', name: '크리스마스 나무', image: 'christmas.png', price: 100000 },
        { id: 'tree_rich', name: '부자 나무', image: 'rich.png', price: 100000 }
    ];
    
    const treeContainer = document.getElementById('treeItems');
    if (treeContainer) {
        treeContainer.innerHTML = '';
        
        // 기본 나무 (무료)
        const defaultTree = document.createElement('div');
        defaultTree.className = 'customize-item';
        const isDefaultSelected = gameState.selectedTree === 'image.png';
        if (isDefaultSelected) {
            defaultTree.classList.add('selected');
        }
        defaultTree.innerHTML = `
            <img src="images/image.png" alt="기본 나무" class="customize-item-image">
            <div class="customize-item-name">기본 나무</div>
            ${isDefaultSelected ? '<div class="customize-item-badge selected">사용중</div>' : ''}
        `;
        defaultTree.addEventListener('click', () => {
            changeTreeImage('image.png');
        });
        treeContainer.appendChild(defaultTree);
        
        // 구매 가능한 나무들
        treeItems.forEach(tree => {
            const isOwned = gameState.ownedTrees.includes(tree.image);
            const isSelected = gameState.selectedTree === tree.image;
            
            const treeItem = document.createElement('div');
            treeItem.className = 'customize-item';
            if (isSelected) treeItem.classList.add('selected');
            if (isOwned) treeItem.classList.add('owned');
            if (!isOwned && gameState.coins < tree.price) {
                treeItem.classList.add('disabled');
            }
            
            treeItem.innerHTML = `
                <img src="images/${tree.image}" alt="${tree.name}" class="customize-item-image">
                <div class="customize-item-name">${tree.name}</div>
                ${isOwned 
                    ? `<div class="customize-item-badge ${isSelected ? 'selected' : 'owned'}">${isSelected ? '사용중' : '보유중'}</div>`
                    : `<div class="customize-item-price">${formatKoreanMoney(tree.price)}</div>`
                }
            `;
            
            treeItem.addEventListener('click', () => {
                if (isOwned) {
                    changeTreeImage(tree.image);
                } else if (gameState.coins >= tree.price) {
                    buyCustomizeItem('tree', tree.id, tree.image, tree.price);
                }
            });
            
            treeContainer.appendChild(treeItem);
        });
    }
    
    // 클릭 이미지 아이템
    const clickContainer = document.getElementById('clickItems');
    if (clickContainer) {
        clickContainer.innerHTML = '';
        
        // 기본 클릭 이미지 (무료)
        const defaultClick = document.createElement('div');
        defaultClick.className = 'customize-item';
        const isDefaultClickSelected = gameState.selectedClickImage === 'pop.png';
        if (isDefaultClickSelected) {
            defaultClick.classList.add('selected');
        }
        defaultClick.innerHTML = `
            <img src="images/pop.png" alt="기본 클릭" class="customize-item-image">
            <div class="customize-item-name">기본 클릭</div>
            ${isDefaultClickSelected ? '<div class="customize-item-badge selected">사용중</div>' : ''}
        `;
        defaultClick.addEventListener('click', () => {
            changeClickImage('pop.png');
        });
        clickContainer.appendChild(defaultClick);
        
        // 코인 클릭 이미지
        const coinClick = { id: 'click_coin', name: '코인 클릭', image: 'coin.png', price: 100000 };
        const isOwned = gameState.ownedClickImages.includes(coinClick.image);
        const isSelected = gameState.selectedClickImage === coinClick.image;
        
        const clickItem = document.createElement('div');
        clickItem.className = 'customize-item';
        if (isSelected) clickItem.classList.add('selected');
        if (isOwned) clickItem.classList.add('owned');
        if (!isOwned && gameState.coins < coinClick.price) {
            clickItem.classList.add('disabled');
        }
        
        clickItem.innerHTML = `
            <img src="images/${coinClick.image}" alt="${coinClick.name}" class="customize-item-image">
            <div class="customize-item-name">${coinClick.name}</div>
            ${isOwned 
                ? `<div class="customize-item-badge ${isSelected ? 'selected' : 'owned'}">${isSelected ? '사용중' : '보유중'}</div>`
                : `<div class="customize-item-price">${formatKoreanMoney(coinClick.price)}</div>`
            }
        `;
        
        clickItem.addEventListener('click', () => {
            if (isOwned) {
                changeClickImage(coinClick.image);
            } else if (gameState.coins >= coinClick.price) {
                buyCustomizeItem('click', coinClick.id, coinClick.image, coinClick.price);
            }
        });
        
        clickContainer.appendChild(clickItem);
    }
}

// 커스터마이징 아이템 구매
function buyCustomizeItem(type, id, image, price) {
    if (gameState.coins < price) return;
    
    // 커스텀 팝업으로 구매 확인
    const itemName = type === 'tree' 
        ? (image === 'christmas.png' ? '크리스마스 나무' : '부자 나무')
        : '코인 클릭';
    const confirmMessage = `${itemName}을(를) ${formatKoreanMoney(price)}에 구매하시겠습니까?`;
    
    showPurchaseConfirm(confirmMessage, () => {
        const oldCoins = gameState.coins;
        gameState.coins -= price;
        
        // 숫자 애니메이션
        const coinElement = document.getElementById('coins');
        if (coinElement) {
            animateNumber(coinElement, gameState.coins, oldCoins);
        }
        
        if (type === 'tree') {
            if (!gameState.ownedTrees.includes(image)) {
                gameState.ownedTrees.push(image);
            }
            changeTreeImage(image);
        } else if (type === 'click') {
            if (!gameState.ownedClickImages.includes(image)) {
                gameState.ownedClickImages.push(image);
            }
            changeClickImage(image);
        }
        
        updateUI();
        saveGame();
    });
}

// 나무 이미지 변경
function changeTreeImage(imageName) {
    gameState.selectedTree = imageName;
    const treeImg = document.getElementById('moneyTree');
    if (treeImg) {
        treeImg.src = `images/${imageName}`;
        treeImg.onerror = function() {
            // 이미지 로드 실패 시 기본 이미지로
            this.src = 'images/image.png';
        };
    }
    renderCustomizeShop();
    saveGame();
}

// 클릭 이미지 변경
function changeClickImage(imageName) {
    gameState.selectedClickImage = imageName;
    renderCustomizeShop();
    saveGame();
}

// 게임 저장 (localStorage)
function saveGame() {
    gameState.lastSaveTime = Date.now(); // 저장 시간 업데이트
    localStorage.setItem('coinGame', JSON.stringify(gameState));
}

// 게임 불러오기 (localStorage - 오프라인 수익 계산 포함)
function loadGame() {
    const saved = localStorage.getItem('coinGame');
    if (saved) {
        const savedState = JSON.parse(saved);
        const oldCoins = gameState.coins;
        
        // 기본 데이터 복원
        gameState.coins = savedState.coins || 0;
        gameState.items = savedState.items || [];
        gameState.boosterActive = savedState.boosterActive || false;
        gameState.boosterEndTime = savedState.boosterEndTime || 0;
        gameState.boosterLastUsedTime = savedState.boosterLastUsedTime || 0;
        gameState.perClick = savedState.perClick || 1;
        gameState.perSecond = savedState.perSecond || 0;
        gameState.selectedTree = savedState.selectedTree || 'image.png';
        gameState.selectedClickImage = savedState.selectedClickImage || 'pop.png';
        gameState.ownedTrees = savedState.ownedTrees || ['image.png'];
        gameState.ownedClickImages = savedState.ownedClickImages || ['pop.png'];
        gameState.lastSaveTime = savedState.lastSaveTime || Date.now();
        
        // 오프라인 수익 계산
        if (gameState.perSecond > 0 && gameState.lastSaveTime) {
            const now = Date.now();
            const timePassed = Math.floor((now - gameState.lastSaveTime) / 1000); // 초 단위
            if (timePassed > 0) {
                const offlineIncome = gameState.perSecond * timePassed;
                gameState.coins += offlineIncome;
                gameState.lastSaveTime = now; // 업데이트 시간 갱신
            }
        }
        
        // 이미지 복원
        setTimeout(() => {
            changeTreeImage(gameState.selectedTree);
        }, 50);
        
        currentDisplayCoins = gameState.coins;
        
        // 부스터 상태 복원
        if (gameState.boosterActive && Date.now() < gameState.boosterEndTime) {
            boosterMultiplier = 2;
            const boosterButton = document.getElementById('boosterButton');
            if (boosterButton) {
                boosterButton.classList.add('active');
            }
            document.body.classList.add('booster-active');
        } else {
            gameState.boosterActive = false;
            boosterMultiplier = 1;
        }
        
        // 효과 재계산
        gameState.perClick = 1;
        gameState.perSecond = 0;
        
        gameState.items.forEach(savedItem => {
            const item = shopItems.find(i => i.id === savedItem.id);
            if (item) {
                for (let i = 0; i < savedItem.count; i++) {
                    if (item.effect === 'click') {
                        gameState.perClick += item.value;
                    } else if (item.effect === 'auto') {
                        gameState.perSecond += item.value;
                    }
                }
            }
        });
        
        // 숫자 애니메이션으로 표시
        const coinElement = document.getElementById('coins');
        if (coinElement) {
            animateNumber(coinElement, gameState.coins, oldCoins);
        }
        
        // 저장 시간 업데이트
        saveGame();
    } else {
        // 새 게임 시작
        gameState.lastSaveTime = Date.now();
        saveGame();
    }
    
    updateUI();
}

// 게임 시작
init();

