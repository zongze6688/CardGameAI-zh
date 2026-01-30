// ========== API 配置 ==========
const API_URL = "/api/chat";
const MODEL = "Qwen/Qwen2.5-72B-Instruct";

// ========== 游戏状态 ==========
let players = [];
let currentPlayerIndex = 0;
let round = 1;
let selectedCard = null;
let records = [];
let wishes = [];
let playerCount = 3;
let pendingCard = null;
let playDirection = 1;
let wishCardGiven = false;
let confirmedPlayers = [];
let cardSelectingPlayer = 0;
let selectedFunctionCards = [];
let playerEmotions = {}; // 存储AI分析的玩家心理状态
let lastAIAnalysis = null;
let analysisInProgress = false;
let selectedWildType = null; // 万能牌选择的类型
let lastPlayerIndex = -1; // 上一个玩家索引，用于判断是否需要显示切换动画

const avatars = ['&#128104;', '&#128105;', '&#129489;', '&#128116;', '&#128117;', '&#129490;'];
const avatarColors = ['#FFE0B2', '#F8BBD9', '#B3E5FC', '#C8E6C9', '#E1BEE7', '#FFCCBC'];
const defaultNames = ['爸爸', '妈妈', '我', '爷爷', '奶奶', '弟弟/妹妹'];

const functionCardTypes = ['reverse', 'explain', 'avoid', 'wild'];

const cardTypes = {
  share: { name: '分享牌', icon: '&#128172;', desc: '回答AI随机生成的问题', class: 'card-share' },
  evaluate: { name: '评价牌', icon: '&#128173;', desc: '说出对方2个优点+2个缺点', class: 'card-evaluate' },
  wish: { name: '心愿牌', icon: '&#127775;', desc: '说出并记录一个心愿', class: 'card-wish' },
  reverse: { name: '反转牌', icon: '&#128260;', desc: '让出牌人回答问题', class: 'card-reverse' },
  explain: { name: '解释牌', icon: '&#128226;', desc: '要求下家进行补充澄清', class: 'card-explain' },
  avoid: { name: '回避牌', icon: '&#128584;', desc: '选择不回答当前问题', class: 'card-avoid' },
  wild: { name: '万能牌', icon: '&#10024;', desc: '变成一张牌自己使用', class: 'card-wild' }
};

// 深度问题话题
const topicTrees = {
  happiness: {
    name: '快乐时刻',
    questions: [
     '最近吃到的哪一样东西，让你觉得味蕾被治愈了？',
      '最近一次觉得“被好好爱着”，是因为什么事？',
      '你有没有一个专属的 “快乐小开关”，一碰就能开心一点？'
    ],
    counter : 0
   },
  gratitude: {
    name: '感恩之心',
    questions: [
      '今年最想感谢的人是谁？',
      '最近有没有遇到过一些温柔的小帮助？',
      '有没有一个小地方，去到那里会让你觉得特别放松、有归属感？'
    ],
    counter : 0
  },
  family: {
    name: '家的温度',
    questions: [
      '家人的哪一个小优点，是你一直以来都很欣赏的？',
      '你觉得家人表达关心的方式，哪一点最贴合你的心意？',
      '有没有一句想对家人说，却还没来得及说的温柔话？'
    ],
    counter : 0
  },
  growth: {
    name: '成长领悟',
    questions: [
      '最近最大的收获或成长是什么？',
     '最近一次发现自己的小进步，是在什么时刻？',
       '有没有一些小事，做完后让你觉得很有成就感？'
    ],
    counter : 0
  },
  unsaid: {
    name: '未说出口的话',
    questions: [
       '有没有一句想对家人说，却还没来得及说的温柔话？',
      '平时是什么会让你一直难以说出某句话？',
      '趁现在，你愿意试着说出来一句你未曾启齿的话吗？'
    ],
    counter : 0
      },
   pressure: {
    name: '压力与释放',
     questions: [
       '最近让你感到压力最大的事是什么？',
          '如果给自己的当下状态打个温柔的标签，你会选什么？',
       '这阵子，你的情绪里最常出现的一种温柔感受是什么？'
    ],
        counter : 0
  }
};

// ========== 页面导航 ==========
function showPage(pageId) {
  console.log('切换到页面:', pageId);
  
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // 显示目标页面
  const nextPage = document.getElementById('page-' + pageId);
  if (nextPage) {
    nextPage.classList.add('active');
    console.log('页面已激活:', pageId);
  } else {
    console.error('找不到页面:', pageId);
  }
}

function goToSetup() { showPage('setup'); }
function goToRules() {
  initPlayers();
  renderConfirmAvatars();
  showPage('rules');
}
function goToCardSelect() {
  console.log('goToCardSelect called, confirmedPlayers:', confirmedPlayers.length, 'players:', players.length);
  if (confirmedPlayers.length !== players.length) {
    console.log('条件不满足，返回');
    return;
  }
  // 跳过功能牌选择页面，直接开始游戏（随机发牌）
  startGame();
}
function goToGame() { showPage('game'); }
function goToSummary() {
  showPage('summary');
  generateAISummary();
}

// ========== 设置页逻辑 ==========
function initPlayerInputs() {
  const container = document.getElementById('player-inputs');
  container.innerHTML = '';
  
  for (let i = 0; i < playerCount; i++) {
    container.innerHTML += `
      <div class="player-input">
        <div class="player-avatar" style="background: ${avatarColors[i]}">${avatars[i]}</div>
        <input type="text" id="player${i+1}" placeholder="玩家${i+1}（如：${defaultNames[i]}）">
      </div>
    `;
  }
}

function setPlayerCount(count) {
  playerCount = count;
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent === count + '人') btn.classList.add('active');
  });
  initPlayerInputs();
}

function initPlayers() {
  players = [];
  for (let i = 0; i < playerCount; i++) {
    const input = document.getElementById(`player${i+1}`);
    const name = input ? input.value.trim() || `玩家${i+1}` : `玩家${i+1}`;
    players.push({
      name: name,
      avatar: avatars[i],
      color: avatarColors[i],
      cards: [],
      functionCards: [],
      active: true
    });
    playerEmotions[name] = { emoji: '&#128566;', word: '等待' };
  }
}

// ========== 入游须知页逻辑 ==========
function renderConfirmAvatars() {
  const container = document.getElementById('confirm-avatars');
  container.innerHTML = players.map((p, i) => `
    <div class="confirm-avatar ${confirmedPlayers.includes(i) ? 'confirmed' : ''}" 
         style="background: ${p.color}" 
         onclick="confirmPlayer(${i})">
      <span class="confirm-avatar-emoji">${p.avatar}</span>
      <span class="confirm-avatar-name">${p.name}</span>
    </div>
  `).join('');
  
  const btn = document.getElementById('btn-to-cards');
  if (confirmedPlayers.length === players.length) {
    btn.disabled = false;
    btn.textContent = '全员已确认，开始游戏';
  } else {
    btn.disabled = true;
    btn.textContent = `还需 ${players.length - confirmedPlayers.length} 人确认`;
  }
}

function confirmPlayer(index) {
  if (confirmedPlayers.includes(index)) {
    confirmedPlayers = confirmedPlayers.filter(i => i !== index);
  } else {
    confirmedPlayers.push(index);
  }
  renderConfirmAvatars();
}

// ========== 功能牌选择页逻辑 ==========
function renderCardSelection() {
  const player = players[cardSelectingPlayer];
  selectedFunctionCards = [];
  
  document.getElementById('selector-avatar').innerHTML = player.avatar;
  document.getElementById('selector-avatar').style.background = player.color;
  document.getElementById('selector-name').textContent = player.name;
  document.getElementById('card-select-hint').textContent = `${player.name}，请选择2张功能牌`;
  
  // 先渲染功能牌
  const grid = document.getElementById('function-cards-grid');
  grid.innerHTML = functionCardTypes.map(type => {
    const card = cardTypes[type];
    return `
      <div class="func-card" id="func-${type}" onclick="toggleFunctionCard('${type}')">
        <div class="func-card-icon">${card.icon}</div>
        <div class="func-card-name">${card.name}</div>
        <div class="func-card-desc">${card.desc}</div>
      </div>
    `;
  }).join('');
  
  // 然后再更新进度（此时 DOM 元素已存在）
  updateCardSelectProgress();
}

function toggleFunctionCard(type) {
  const card = document.getElementById(`func-${type}`);
  if (card.classList.contains('disabled')) return;
  
  if (selectedFunctionCards.includes(type)) {
    selectedFunctionCards = selectedFunctionCards.filter(t => t !== type);
    card.classList.remove('selected');
  } else if (selectedFunctionCards.length < 2) {
    selectedFunctionCards.push(type);
    card.classList.add('selected');
  }
  updateCardSelectProgress();
}

function updateCardSelectProgress() {
  document.getElementById('selector-progress').textContent = `已选 ${selectedFunctionCards.length}/2`;
  
  const btn = document.getElementById('btn-confirm-cards');
  btn.disabled = selectedFunctionCards.length !== 2;
  btn.textContent = selectedFunctionCards.length === 2 ? '确认选择' : `还需选 ${2 - selectedFunctionCards.length} 张`;
  
  functionCardTypes.forEach(type => {
    const card = document.getElementById(`func-${type}`);
    if (selectedFunctionCards.length >= 2 && !selectedFunctionCards.includes(type)) {
      card.classList.add('disabled');
    } else {
      card.classList.remove('disabled');
    }
  });
}

function confirmCardSelection() {
  if (selectedFunctionCards.length !== 2) return;
  
  players[cardSelectingPlayer].functionCards = [...selectedFunctionCards];
  cardSelectingPlayer++;
  
  if (cardSelectingPlayer < players.length) {
    renderCardSelection();
  } else {
    startGame();
  }
}

// ========== 游戏逻辑 ==========
function startGame() {
  playDirection = 1;
  wishCardGiven = false;
  records = [];
  wishes = [];
  round = 1;
  currentPlayerIndex = 0;
  lastPlayerIndex = -1;
  
  // 随机发牌策略
  distributeCards();
  
  pendingCard = null;
  showPage('game');
  updateGameUI();
}

// 随机发牌函数
function distributeCards() {
  const playerNum = players.length;
  const contentPerPlayer = 3; // 每人3张内容牌
  const functionPerPlayer = 2; // 每人2张功能牌
  
  // 创建内容牌池（心愿牌全场只有1张）
  let contentPool = [];
  const totalContentNeeded = playerNum * contentPerPlayer;
  // 1张心愿牌，其余平分给分享牌和评价牌
  const remainingContent = totalContentNeeded - 1;
  const shareCount = Math.ceil(remainingContent / 2);
  const evaluateCount = remainingContent - shareCount;
  
  contentPool.push({ type: 'wish' }); // 唯一的心愿牌
  for (let i = 0; i < shareCount; i++) {
    contentPool.push({ type: 'share' });
  }
  for (let i = 0; i < evaluateCount; i++) {
    contentPool.push({ type: 'evaluate' });
  }
  
  // 创建功能牌池（万能牌全场只有1张）
  let functionPool = [];
  const totalFunctionNeeded = playerNum * functionPerPlayer;
  // 1张万能牌，其余平分给反转、解释、回避牌
  const remainingFunction = totalFunctionNeeded - 1;
  const perTypeCount = Math.floor(remainingFunction / 3);
  const extraCards = remainingFunction % 3;
  
  functionPool.push({ type: 'wild' }); // 唯一的万能牌
  for (let i = 0; i < perTypeCount + (extraCards > 0 ? 1 : 0); i++) {
    functionPool.push({ type: 'reverse' });
  }
  for (let i = 0; i < perTypeCount + (extraCards > 1 ? 1 : 0); i++) {
    functionPool.push({ type: 'explain' });
  }
  for (let i = 0; i < perTypeCount; i++) {
    functionPool.push({ type: 'avoid' });
  }
  
  // 洗牌（Fisher-Yates算法确保随机性）
  shuffleArray(contentPool);
  shuffleArray(functionPool);
  
  // 为每个玩家发牌：每人3张内容牌 + 2张功能牌
  players.forEach(player => {
    player.cards = [];
    playerEmotions[player.name] = { emoji: '&#128566;', word: '等待' };
    
    // 发3张内容牌
    for (let i = 0; i < contentPerPlayer && contentPool.length > 0; i++) {
      player.cards.push(contentPool.pop());
    }
    
    // 发2张功能牌
    for (let i = 0; i < functionPerPlayer && functionPool.length > 0; i++) {
      player.cards.push(functionPool.pop());
    }
    
    // 打乱玩家手牌顺序，增加随机性
    shuffleArray(player.cards);
  });
  
  console.log('发牌完成，各玩家手牌:', players.map(p => ({name: p.name, cards: p.cards.map(c => c.type)})));
}

// 洗牌函数（Fisher-Yates算法）
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function updateGameUI() {
  const current = players[currentPlayerIndex];
  
  // 检查是否需要显示玩家切换动画
  if (lastPlayerIndex !== -1 && lastPlayerIndex !== currentPlayerIndex) {
    showTurnAnimation(current);
  }
  lastPlayerIndex = currentPlayerIndex;
  
  document.getElementById('current-avatar').innerHTML = current.avatar;
  document.getElementById('current-avatar').style.background = current.color;
  document.getElementById('current-name').textContent = current.name;
  document.getElementById('round-number').textContent = round;
  
  updatePlayersBar();
  updateHandCards();
  
  selectedCard = null;
  document.getElementById('btn-confirm').disabled = true;
  
  if (pendingCard) {
    showPendingCard();
  } else {
    showNormalActionArea();
  }
}

// 显示正常的操作区域（无待处理牌时）
function showNormalActionArea() {
  document.getElementById('action-area').style.display = 'block';
  document.getElementById('action-title').textContent = '请选择一张牌出牌';
  document.getElementById('question-display').style.display = 'none';
  
  const btnGroup = document.querySelector('#action-area .btn-group');
  btnGroup.innerHTML = `
    <button class="btn btn-primary" id="btn-confirm" onclick="confirmPlay()" disabled>确认出牌</button>
    <button class="btn btn-accent" onclick="nextTurn()">结束出牌</button>
  `;
}

// 显示玩家切换动画
function showTurnAnimation(player) {
  const overlay = document.getElementById('turn-overlay');
  document.getElementById('turn-avatar').innerHTML = player.avatar;
  document.getElementById('turn-avatar').style.background = player.color;
  document.getElementById('turn-text').textContent = `轮到 ${player.name} 出牌`;
  
  overlay.classList.add('show');
  
  // 2秒后自动关闭
  setTimeout(() => {
    overlay.classList.remove('show');
  }, 2000);
  
  // 点击任意位置关闭
  overlay.onclick = () => {
    overlay.classList.remove('show');
  };
}

function updatePlayersBar() {
  const bar = document.getElementById('players-bar');
  bar.innerHTML = players.map((p, i) => {
    const emotion = playerEmotions[p.name] || { emoji: '&#128566;', word: '等待' };
    return `
      <div class="player-chip ${!p.active ? 'inactive' : ''} ${i === currentPlayerIndex ? 'current' : ''}">
        <div class="chip-avatar" style="background: ${p.color}">${p.avatar}</div>
        <div class="chip-info">
          <div class="chip-name">${p.name}</div>
          <div class="chip-status">${p.active ? p.cards.length + '张牌' : '旁听'}</div>
        </div>
        <div class="chip-emotion" title="${emotion.word}">${emotion.emoji}</div>
      </div>
    `;
  }).join('');
}

function updateHandCards() {
  const current = players[currentPlayerIndex];
  const container = document.getElementById('hand-cards');
  
  container.innerHTML = current.cards.map((card, index) => {
    const type = cardTypes[card.type];
    return `
      <div class="card ${type.class}" onclick="selectCard(${index})" id="card-${index}">
        <div class="card-icon">${type.icon}</div>
        <div class="card-name">${type.name}</div>
        <div class="card-desc">${type.desc}</div>
      </div>
    `;
  }).join('');
}

function selectCard(index) {
  if (pendingCard) {
    alert('请先执行收到的牌');
    return;
  }
  
  const current = players[currentPlayerIndex];
  const card = current.cards[index];
  
  // 回避牌和反转牌不能主动出牌，只能在收到分享牌或评价牌时响应使用
  if (card.type === 'avoid') {
    alert('回避牌只能在收到分享牌或评价牌时使用，不能主动打出！');
    return;
  }
  if (card.type === 'reverse') {
    alert('反转牌只能在收到分享牌或评价牌时使用，不能主动打出！');
    return;
  }
  
  // 心愿牌是自己使用的，不是打给下家
  if (card.type === 'wish') {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    document.getElementById('card-' + index).classList.add('selected');
    selectedCard = index;
    
    const type = cardTypes[card.type];
    document.getElementById('action-area').style.display = 'block';
    document.getElementById('action-title').textContent = `选中：${type.name}`;
    document.getElementById('btn-confirm').textContent = '许下心愿';
    document.getElementById('btn-confirm').disabled = false;
    document.getElementById('btn-confirm').onclick = executeWishCard;
    
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = '说出你的一个心愿，心愿牌将随机分给其他玩家';
    return;
  }
  
  // 万能牌也是自己使用的
  if (card.type === 'wild') {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    document.getElementById('card-' + index).classList.add('selected');
    selectedCard = index;
    
    const type = cardTypes[card.type];
    document.getElementById('action-area').style.display = 'block';
    document.getElementById('action-title').textContent = `选中：${type.name}`;
    document.getElementById('btn-confirm').textContent = '使用万能牌';
    document.getElementById('btn-confirm').disabled = false;
    document.getElementById('btn-confirm').onclick = useWildCard;
    
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = '选择变成：分享/评价/解释/反转/回避牌';
    return;
  }
  
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
  document.getElementById('card-' + index).classList.add('selected');
  selectedCard = index;
  
  const type = cardTypes[card.type];
  const nextPlayer = getNextActivePlayer();
  
  document.getElementById('action-area').style.display = 'block';
  document.getElementById('action-title').textContent = `选中：${type.name}`;
  document.getElementById('btn-confirm').textContent = `发给 ${nextPlayer.name}`;
  document.getElementById('btn-confirm').disabled = false;
  document.getElementById('btn-confirm').onclick = confirmPlay;
  
  document.getElementById('question-display').style.display = 'block';
  document.getElementById('question-type').textContent = type.name;
  document.getElementById('question-text').textContent = `${nextPlayer.name} 将执行：${type.desc}`;
}

// 执行心愿牌（自己使用）
function executeWishCard() {
  if (selectedCard === null) return;
  
  const current = players[currentPlayerIndex];
  
  // 移除心愿牌
  current.cards.splice(selectedCard, 1);
  selectedCard = null;
  
  // 显示心愿输入弹窗
  showAnswerModal('说出你的一个心愿', '心愿时刻', '&#127775;');
}

// 使用万能牌（打开选择弹窗）
function useWildCard() {
  if (selectedCard === null) return;
  
  // 显示万能牌选择弹窗（显示场上所有可选牌类型）
  showWildCardModal();
}

// 显示万能牌选择弹窗（固定的5种牌类型）
function showWildCardModal() {
  selectedWildType = null;
  
  // 万能牌可变成的固定牌类型（不包括心愿牌和万能牌本身）
  const availableTypes = ['share', 'evaluate', 'explain', 'reverse', 'avoid'];
  
  // 动态生成选项
  const optionsContainer = document.querySelector('.wild-card-options');
  optionsContainer.innerHTML = availableTypes.map(type => {
    const cardInfo = cardTypes[type];
    return `
      <div class="wild-option" onclick="selectWildOption('${type}')">
        <div class="wild-option-icon">${cardInfo.icon}</div>
        <div class="wild-option-name">${cardInfo.name}</div>
      </div>
    `;
  }).join('');
  
  document.getElementById('btn-wild-confirm').disabled = true;
  document.getElementById('modal-wild').classList.add('show');
}

function getNextActivePlayer() {
  let nextIndex = currentPlayerIndex;
  do {
    nextIndex = (nextIndex + playDirection + players.length) % players.length;
  } while (!players[nextIndex].active && nextIndex !== currentPlayerIndex);
  return players[nextIndex];
}

function getRandomQuestion() {
  const topics = Object.values(topicTrees);
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const question = topic.questions[Math.floor(Math.random() * topic.questions.length)];
  //topic.counter++;
  return { text: question, topicName: topic.name };
}

function showPendingCard() {
  const type = cardTypes[pendingCard.type];
  const current = players[currentPlayerIndex];
  
  document.getElementById('action-area').style.display = 'block';
  document.getElementById('action-title').textContent = `${pendingCard.fromPlayer} 给你的牌`;
  document.getElementById('btn-confirm').textContent = '执行此牌';
  document.getElementById('btn-confirm').disabled = false;
  document.getElementById('btn-confirm').onclick = executePendingCard;
  
  // 检查是否可以使用回避牌或反转牌（只有收到分享牌或评价牌时才能使用）
  const hasAvoidCard = current.cards.some(c => c.type === 'avoid');
  const hasReverseCard = current.cards.some(c => c.type === 'reverse');
  const canUseResponseCard = pendingCard.type === 'share' || pendingCard.type === 'evaluate';
  
  // 更新按钮组，根据可用的响应牌显示按钮
  const btnGroup = document.querySelector('#action-area .btn-group');
  let buttonsHtml = '<button class="btn btn-primary" id="btn-confirm" onclick="executePendingCard()">执行此牌</button>';
  
  if (canUseResponseCard && hasReverseCard) {
    buttonsHtml += '<button class="btn btn-secondary" onclick="useReverseCard()">使用反转牌</button>';
  }
  if (canUseResponseCard && hasAvoidCard) {
    buttonsHtml += '<button class="btn btn-secondary" onclick="useAvoidCard()">使用回避牌</button>';
  }
  
  btnGroup.innerHTML = buttonsHtml;
  
  if (pendingCard.type === 'share') {
    // 只有在问题不存在时才生成新问题（反转牌时保留原问题）
    if (!pendingCard.question) {
      const q = getRandomQuestion();
      pendingCard.question = q.text;
      pendingCard.topicName = q.topicName;
    }
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = `${type.name} - ${pendingCard.topicName}`;
    document.getElementById('question-text').textContent = pendingCard.question;
  } else if (pendingCard.type === 'wish') {
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = '说出你的一个心愿';
  } else if (pendingCard.type === 'evaluate') {
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = '评价一位在场的玩家';
  } else {
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = type.desc;
  }
}

// 使用反转牌 - 让出牌人执行这张牌
function useReverseCard() {
  const current = players[currentPlayerIndex];
  const reverseIndex = current.cards.findIndex(c => c.type === 'reverse');
  
  if (reverseIndex === -1) {
    alert('你没有反转牌了！');
    return;
  }
  
  // 移除反转牌（不添加新牌）
  current.cards.splice(reverseIndex, 1);
  
  // 记录使用反转牌
  addRecord(current.name, '反转牌', `将${cardTypes[pendingCard.type].name}反转给 ${pendingCard.fromPlayer}`);
  
  // 检查游戏是否结束
  if (checkGameEnd()) return;
  
  // 直接把牌反转给原出牌人，让他执行
  const originalFromPlayerIndex = pendingCard.fromPlayerIndex;
  
  // 保留原问题内容（重要：反转后原出牌人要回答同一个问题）
  const savedQuestion = pendingCard.question;
  const savedTopicName = pendingCard.topicName;
  
  // 更新 pendingCard，fromPlayer 变为使用反转牌的人
  pendingCard.fromPlayer = current.name;
  pendingCard.fromPlayerIndex = currentPlayerIndex;
  pendingCard.question = savedQuestion;
  pendingCard.topicName = savedTopicName;
  
  // 切换到原出牌人
  currentPlayerIndex = originalFromPlayerIndex;
  
  // 更新UI，原出牌人需要执行被反转的牌
  updateGameUI();
}

// 使用回避牌
function useAvoidCard() {
  const current = players[currentPlayerIndex];
  const avoidIndex = current.cards.findIndex(c => c.type === 'avoid');
  
  if (avoidIndex === -1) {
    alert('你没有回避牌了！');
    return;
  }
  
  // 移除回避牌（不添加新牌）
  current.cards.splice(avoidIndex, 1);
  
  // 记录使用回避牌
  addRecord(current.name, '回避牌', '选择不回答这个问题');
  
  // 检查游戏是否结束
  if (checkGameEnd()) return;
  
  // 清除待处理牌，直接进入下一回合
  pendingCard = null;
  nextTurn();
}

function executePendingCard() {
  if (!pendingCard) return;
  
  switch (pendingCard.type) {
    case 'share':
      showAnswerModal(pendingCard.question, '分享时刻', '&#128172;');
      break;
    case 'evaluate':
      showEvaluateModal();
      break;
    case 'wish':
      showAnswerModal('说出你的一个心愿', '心愿时刻', '&#127775;');
      break;
    case 'reverse':
      handleReverseCard();
      break;
    case 'avoid':
      handleAvoidCard();
      break;
    case 'explain':
      showAnswerModal('请补充或澄清你想说的内容', '解释时刻', '&#128226;');
      break;
    case 'wild':
      handleWildCard();
      break;
    default:
      showAnswerModal(`使用${cardTypes[pendingCard.type].name}`, cardTypes[pendingCard.type].name, cardTypes[pendingCard.type].icon);
  }
}

function handleReverseCard() {
  // 反转牌不能通过 executePendingCard 执行，只能通过 useReverseCard 响应使用
  alert('反转牌只能在收到分享牌或评价牌时使用！');
}

function handleAvoidCard() {
  // 回避牌不能通过 executePendingCard 执行，只能通过 useAvoidCard 响应使用
  alert('回避牌只能在收到分享牌或评价牌时使用！');
}

function handleWildCard() {
  // 显示万能牌选择弹窗
  selectedWildType = null;
  document.querySelectorAll('.wild-option').forEach(opt => opt.classList.remove('selected'));
  document.getElementById('btn-wild-confirm').disabled = true;
  document.getElementById('modal-wild').classList.add('show');
}

function selectWildOption(type) {
  selectedWildType = type;
  document.querySelectorAll('.wild-option').forEach(opt => opt.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  document.getElementById('btn-wild-confirm').disabled = false;
}

function confirmWildSelection() {
  if (!selectedWildType || selectedCard === null) return;
  document.getElementById('modal-wild').classList.remove('show');
  
  const current = players[currentPlayerIndex];
  
  // 移除万能牌
  current.cards.splice(selectedCard, 1);
  
  // 记录使用万能牌
  addRecord(current.name, '万能牌', `变成了${cardTypes[selectedWildType].name}`);
  
  // 检查游戏是否结束
  if (checkGameEnd()) return;
  
  selectedCard = null;
  
  // 万能牌变形后自己执行（不是发给下家）
  switch (selectedWildType) {
    case 'share':
      showAnswerModal(getRandomQuestion().text, '分享时刻', '&#128172;');
      break;
    case 'evaluate':
      // 评价牌：自己评价其他玩家
      showSelfEvaluateModal();
      break;
    case 'explain':
      showAnswerModal('请补充或澄清你想说的内容', '解释时刻', '&#128226;');
      break;
    case 'reverse':
    case 'avoid':
      // 反转牌和回避牌是响应牌，变成后加入手牌
      current.cards.push({ type: selectedWildType });
      alert(`万能牌已变成${cardTypes[selectedWildType].name}，已加入你的手牌！`);
      updateGameUI();
      break;
  }
  
  selectedWildType = null;
}

// 自己使用评价牌时的弹窗（选择要评价的玩家）
function showSelfEvaluateModal() {
  // 获取其他玩家列表
  const otherPlayers = players.filter((p, i) => i !== currentPlayerIndex && p.active);
  if (otherPlayers.length === 0) {
    alert('没有其他玩家可以评价！');
    updateGameUI();
    return;
  }
  
  // 随机选择一个玩家进行评价
  const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
  document.getElementById('evaluate-target-name').textContent = targetPlayer.name;
  document.getElementById('evaluate-content').value = '';
  
  // 标记这是自己使用评价牌
  pendingCard = { type: 'evaluate', fromPlayer: players[currentPlayerIndex].name, selfUse: true, targetPlayer: targetPlayer.name };
  
  document.getElementById('modal-evaluate').classList.add('show');
}

function confirmPlay() {
  if (selectedCard === null) return;
  
  const current = players[currentPlayerIndex];
  const card = current.cards[selectedCard];
  
  pendingCard = {
    type: card.type,
    fromPlayer: current.name,
    fromPlayerIndex: currentPlayerIndex
  };
  
  current.cards.splice(selectedCard, 1);
  selectedCard = null;
  
  // 检查游戏是否结束
  if (checkGameEnd()) return;
  
  nextTurn();
}

function showAnswerModal(question, title, icon) {
  document.getElementById('modal-icon').innerHTML = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-question').textContent = question;
  document.getElementById('modal-input').value = '';
  document.getElementById('modal-answer').classList.add('show');
}

function showEvaluateModal() {
  const evaluateTarget = pendingCard ? pendingCard.fromPlayer : '某人';
  document.getElementById('evaluate-target-name').textContent = evaluateTarget;
  document.getElementById('evaluate-content').value = '';
  document.getElementById('modal-evaluate').classList.add('show');
}

function submitAnswer() {
  const content = document.getElementById('modal-input').value.trim();
  if (!content) {
    alert('请输入内容');
    return;
  }
  
  // 停止语音录制
  stopVoiceRecording();
  
  const current = players[currentPlayerIndex];
  const cardType = pendingCard ? pendingCard.type : 'share';
  const type = cardTypes[cardType];
  
  // 判断是否是心愿牌（自己使用的情况，pendingCard为null）
  const isWishFromSelf = !pendingCard && document.getElementById('modal-title').textContent === '心愿时刻';
  
  // 判断是否是万能牌变形后自己执行（分享牌或解释牌）
  const isWildSelfUse = !pendingCard && (
    document.getElementById('modal-title').textContent === '分享时刻' ||
    document.getElementById('modal-title').textContent === '解释时刻'
  );
  
  if (cardType === 'wish' || isWishFromSelf) {
    wishes.push({ player: current.name, wish: content });
    addRecord(current.name, '心愿牌', `许下心愿：${content}`);
    // 心愿牌使用后消耗掉，不再转赠给其他玩家
    alert('心愿已记录！您的心愿将在游戏结束时的总结中展示。');
  } else if (isWildSelfUse) {
    // 万能牌变形后自己执行
    const modalTitle = document.getElementById('modal-title').textContent;
    const cardName = modalTitle === '分享时刻' ? '分享牌' : '解释牌';
    addRecord(current.name, cardName, content);
  } else {
    addRecord(current.name, type.name, content);
  }
  
  document.getElementById('modal-answer').classList.remove('show');
  
  // 触发AI分析
  triggerAIAnalysis();
  
  // 如果是自己使用的心愿牌或万能牌变形，直接更新UI
  if (isWishFromSelf || isWildSelfUse) {
    // 检查游戏是否结束
    if (checkGameEnd()) return;
    updateGameUI();
  } else {
    clearPendingAndNext();
  }
}

function submitEvaluate() {
  const content = document.getElementById('evaluate-content').value.trim();
  if (!content) {
    alert('请输入评价内容');
    return;
  }
  
  // 停止语音录制
  stopVoiceRecording();
  
  const current = players[currentPlayerIndex];
  
  // 判断是否是自己使用评价牌（万能牌变形后）
  const isSelfUse = pendingCard && pendingCard.selfUse;
  
  if (isSelfUse) {
    const targetName = pendingCard.targetPlayer;
    addRecord(current.name, '评价牌', `对${targetName}说：${content}`);
    pendingCard = null;
  } else {
    const evaluateTarget = pendingCard ? pendingCard.fromPlayer : '某人';
    addRecord(current.name, '评价牌', `对${evaluateTarget}说：${content}`);
  }
  
  document.getElementById('modal-evaluate').classList.remove('show');
  
  // 触发AI分析
  triggerAIAnalysis();
  
  // 如果是自己使用，直接更新UI
  if (isSelfUse) {
    if (checkGameEnd()) return;
    updateGameUI();
  } else {
    clearPendingAndNext();
  }
}

function clearPendingAndNext() {
  pendingCard = null;
  updateGameUI();
}

function nextTurn() {
  checkWishCardTrigger();
  
  let nextIndex = currentPlayerIndex;
  let loopCount = 0;
  do {
    nextIndex = (nextIndex + playDirection + players.length) % players.length;
    loopCount++;
    if (loopCount > players.length) break;
  } while (!players[nextIndex].active);
  
  currentPlayerIndex = nextIndex;
  
  if (playDirection === 1 && currentPlayerIndex === 0) round++;
  if (playDirection === -1 && currentPlayerIndex === players.length - 1) round++;
  
  updateGameUI();
}

function checkWishCardTrigger() {
  // 心愿牌现在是自己使用后随机分给其他玩家，不再需要额外触发
  return;
}

// 检查游戏是否结束（任意玩家手牌打完）
function checkGameEnd() {
  const emptyHandPlayer = players.find(p => p.active && p.cards.length === 0);
  if (emptyHandPlayer) {
    // 显示游戏结束提示
    setTimeout(() => {
      alert(`${emptyHandPlayer.name} 的手牌已全部打完，游戏结束！\n即将查看对话总结...`);
      goToSummary();
    }, 500);
    return true;
  }
  return false;
}

function addRecord(playerName, cardName, content) {
  records.push({ player: playerName, card: cardName, content: content, time: new Date() });
  updateRecords();
}

function updateRecords() {
  const container = document.getElementById('records-list');
  if (records.length === 0) {
    container.innerHTML = '<div class="empty-records">还没有对话记录，出牌开始吧！</div>';
    return;
  }
  
  container.innerHTML = records.slice(-5).map(r => `
    <div class="record-item">
      <div class="record-header">
        <span class="record-player">${r.player}</span>
        <span class="record-card">${r.card}</span>
      </div>
      <div class="record-content">${r.content}</div>
    </div>
  `).join('');
}

// ========== AI 分析系统 ==========
async function callAPI(messages) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 1024,
        temperature: 1.0,
      })
    });
    
    if (!response.ok) {
      throw new Error(`API错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API调用失败:', error);
    return null;
  }
}

async function triggerAIAnalysis() {
  if (analysisInProgress || records.length === 0) return;
  analysisInProgress = true;
  
  document.getElementById('ai-insight').innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI 分析中...</span></div>';
  
  const recentRecords = records.slice(-10).map(r => `${r.player}(${r.card}): ${r.content}`).join('\n');
  const playerNames = players.map(p => p.name).join('、');
  
  const prompt = `你是一个专业的家庭对话分析师。请分析以下家庭对话记录，并完成两个任务：

对话参与者：${playerNames}

最近的对话记录：
${recentRecords}

任务1：为每位参与者分析当前的心理状态，用一个词概括（如：开心、感动、思考、紧张、放松、期待、感恩、犹豫等）。

任务2：给出一段简短的对话洞察（2-3句话），以一种幽默、轻松的方式，说明当前对话的氛围和值得关注的点。

请严格按以下JSON格式回复（不要有其他内容）：
{
  "emotions": {
    "玩家名1": {"emoji": "表情符号", "word": "一个词"},
    "玩家名2": {"emoji": "表情符号", "word": "一个词"}
  },
  "insight": "对话洞察内容"
}

表情符号参考：开心用&#128522;，感动用&#129402;，思考用&#129300;，紧张用&#128556;，放松用&#128524;，期待用&#129321;，感恩用&#128591;，犹豫用&#128533;`;
  
  const messages = [
    { role: "system", content: "你是一个专业的家庭对话分析师，擅长分析家庭成员之间的对话，理解每个人的情绪和心理状态。请始终用JSON格式回复。" },
    { role: "user", content: prompt }
  ];
  
  const result = await callAPI(messages);
  
  if (result) {
    try {
      // 尝试解析JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // 更新玩家情绪
        if (analysis.emotions) {
          Object.keys(analysis.emotions).forEach(name => {
            if (playerEmotions[name]) {
              playerEmotions[name] = analysis.emotions[name];
            }
          });
          updatePlayerEmotionsDisplay();
          updatePlayersBar();
        }
        
        // 更新洞察
        if (analysis.insight) {
          document.getElementById('ai-insight').textContent = analysis.insight;
        }
        
        lastAIAnalysis = analysis;
      }
    } catch (e) {
      console.error('解析AI响应失败:', e);
      document.getElementById('ai-insight').textContent = '对话分析中，请继续游戏...';
    }
  } else {
    document.getElementById('ai-insight').textContent = '对话进行中，AI正在观察...';
  }
  
  analysisInProgress = false;
}

function updatePlayerEmotionsDisplay() {
  const container = document.getElementById('player-emotions');
  container.innerHTML = players.map(p => {
    const emotion = playerEmotions[p.name] || { emoji: '&#128566;', word: '等待' };
    return `
      <div class="player-emotion-card">
        <div class="player-emotion-name">${p.name}</div>
        <div class="player-emotion-emoji">${emotion.emoji}</div>
        <div class="player-emotion-word">${emotion.word}</div>
      </div>
    `;
  }).join('');
}

// ========== AI 总结生成 ==========
async function generateAISummary() {
  const container = document.getElementById('summary-content');
  container.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI 正在生成总结...</span></div>';
  
  if (records.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">还没有对话记录，先玩几轮吧！</p>';
    return;
  }
  
  const allRecords = records.map(r => `${r.player}(${r.card}): ${r.content}`).join('\n');
  const playerNames = players.map(p => p.name).join('、');
  const wishList = wishes.map(w => `${w.player}的心愿：${w.wish}`).join('\n') || '暂无心愿';
  
  const prompt = `你是一个专业的家庭对话分析师和心理咨询师。请为这次深度对话游戏生成一份温暖、有洞察力的总结报告。

对话参与者：${playerNames}
对话轮次：${round}轮
心愿池：
${wishList}

完整对话记录：
${allRecords}

请生成一份包含以下四段内容的总结报告，不要出现'**'之间的标题内容：

**对话概览**简要描述这次对话的整体情况（2-3句话）

**每位参与者分析**
   - 分析每位参与者在对话中展现的特点
   - 他们表达的核心情感和想法
   - 给每个人一句温暖的评价

**家庭关系洞察**
   - 从对话中发现的家庭关系特点
   - 值得珍惜的互动瞬间
   - 可能需要更多关注的方面

**鼓励与建议**
   - 给这个家庭的真诚鼓励
   - 后续可以尝试的沟通建议

请用温暖、真诚、有洞察力的语气来写，让参与者感受到被理解和支持。`;
  
  const messages = [
    { role: "system", content: "你是一个专业的家庭对话分析师和心理咨询师，你的任务是为家庭对话生成温暖、有洞察力的总结报告。你的语言风格温暖真诚，善于发现每个人的闪光点，给予肯定和鼓励。" },
    { role: "user", content: prompt }
  ];
  
  const result = await callAPI(messages);
  
  // 生成心愿池HTML（放在总结上方）
  const wishPoolHtml = wishes.length > 0 
    ? `<div class="wish-pool-card">
        <div class="wish-pool-title">&#127775; 心愿池</div>
        <div class="wish-pool-list">
          ${wishes.map(w => `<div class="wish-item">&#127775; ${w.player}的心愿：${w.wish}</div>`).join('')}
        </div>
      </div>`
    : '';
  
  if (result) {
    container.innerHTML = `
      ${wishPoolHtml}
      
      <div class="summary-card">
        <div class="summary-title">对话总结</div>
        <div class="summary-section">
          <div class="ai-summary-text">${result.replace(/\n/g, '<br>')}</div>
        </div>
      </div>
      
      <div class="encouragement-card">
        <div class="encouragement-title">&#127775; 本次对话数据</div>
        <div class="encouragement-text">
          参与人数：${players.length} 人<br>
          对话轮次：${round} 轮<br>
          发言记录：${records.length} 条<br>
          收集心愿：${wishes.length} 个
        </div>
      </div>
    `;
  } else {
    // 生成本地总结
    container.innerHTML = generateLocalSummary();
  }
}

function generateLocalSummary() {
  const emotionSummary = players.map(p => {
    const emotion = playerEmotions[p.name] || { emoji: '&#128566;', word: '等待' };
    return `<div>${p.avatar} ${p.name}：${emotion.emoji} ${emotion.word}</div>`;
  }).join('');
  
  // 心愿池放在最上方
  const wishPoolHtml = wishes.length > 0 
    ? `<div class="wish-pool-card">
        <div class="wish-pool-title">&#127775; 心愿池</div>
        <div class="wish-pool-list">
          ${wishes.map(w => `<div class="wish-item">&#127775; ${w.player}的心愿：${w.wish}</div>`).join('')}
        </div>
      </div>`
    : '';
  
  return `
    ${wishPoolHtml}
    
    <div class="summary-card">
      <div class="summary-title">&#128202; 本次对话总结</div>
      
      <div class="summary-section">
        <div class="summary-section-title">&#127919; 对话概览</div>
        <div class="summary-list">
          本次对话共进行了 ${round} 轮，${players.length} 位家庭成员参与了 ${records.length} 次分享。
        </div>
      </div>
      
      <div class="summary-section">
        <div class="summary-section-title">&#128173; 参与者状态</div>
        <div class="summary-list">${emotionSummary}</div>
      </div>
    </div>
    
    <div class="encouragement-card">
      <div class="encouragement-title">&#127775; 继续前进</div>
      <div class="encouragement-text">
        感谢你们愿意坐下来，用这种方式进行深度对话。<br><br>
        每一次真诚的分享，都是家庭关系更进一步的契机。<br><br>
        希望今天的对话能够成为你们美好回忆的一部分！
      </div>
    </div>
  `;
}

function restartGame() {
  players = [];
  records = [];
  wishes = [];
  confirmedPlayers = [];
  playerEmotions = {};
  round = 1;
  currentPlayerIndex = 0;
  showPage('setup');
  initPlayerInputs();
}

// ========== 语音识别功能 ==========
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceRecognition = null;
let isVoiceRecording = false;
let currentVoiceTarget = null; // 'answer' 或 'evaluate'

// 初始化语音识别
function initVoiceRecognition() {
  if (!SpeechRecognition) {
    console.log('浏览器不支持语音识别');
    // 隐藏语音按钮
    document.querySelectorAll('.voice-btn').forEach(btn => {
      btn.style.display = 'none';
    });
    return;
  }
  
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = 'zh-CN';
  
  voiceRecognition.onstart = function() {
    isVoiceRecording = true;
    updateVoiceUI(true);
  };
  
  voiceRecognition.onend = function() {
    if (isVoiceRecording) {
      // 如果还在录音状态，自动重新开始
      try {
        voiceRecognition.start();
      } catch (e) {
        stopVoiceRecording();
      }
    } else {
      updateVoiceUI(false);
    }
  };
  
  voiceRecognition.onresult = function(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // 获取目标输入框
    const targetInput = currentVoiceTarget === 'answer' 
      ? document.getElementById('modal-input')
      : document.getElementById('evaluate-content');
    
    if (targetInput) {
      // 追加最终识别的文字
      if (finalTranscript) {
        targetInput.value += finalTranscript;
      }
      
      // 显示临时识别状态
      const statusEl = document.getElementById('voice-status-' + currentVoiceTarget);
      if (statusEl && interimTranscript) {
        statusEl.textContent = '识别中: ' + interimTranscript;
        statusEl.classList.add('recording');
      }
    }
  };
  
  voiceRecognition.onerror = function(event) {
    console.error('语音识别错误:', event.error);
    
    const statusEl = currentVoiceTarget 
      ? document.getElementById('voice-status-' + currentVoiceTarget)
      : null;
    
    switch(event.error) {
      case 'no-speech':
        // 静默处理
        break;
      case 'audio-capture':
        if (statusEl) statusEl.textContent = '未检测到麦克风';
        stopVoiceRecording();
        break;
      case 'not-allowed':
        if (statusEl) statusEl.textContent = '请允许使用麦克风';
        stopVoiceRecording();
        break;
      default:
        if (statusEl) statusEl.textContent = '识别出错，请重试';
        stopVoiceRecording();
    }
  };
}

// 切换语音输入
function toggleVoiceInput(target) {
  if (!SpeechRecognition) {
    alert('您的浏览器不支持语音识别，请使用 Chrome、Edge 或 Safari 浏览器。');
    return;
  }
  
  if (isVoiceRecording && currentVoiceTarget === target) {
    stopVoiceRecording();
  } else {
    // 如果正在录其他的，先停止
    if (isVoiceRecording) {
      stopVoiceRecording();
    }
    startVoiceRecording(target);
  }
}

// 开始语音录制
function startVoiceRecording(target) {
  if (!voiceRecognition) {
    initVoiceRecognition();
  }
  
  currentVoiceTarget = target;
  
  const statusEl = document.getElementById('voice-status-' + target);
  if (statusEl) {
    statusEl.textContent = '正在聆听...';
    statusEl.classList.add('recording');
  }
  
  try {
    voiceRecognition.start();
  } catch (e) {
    console.error('启动语音识别失败:', e);
  }
}

// 停止语音录制
function stopVoiceRecording() {
  isVoiceRecording = false;
  currentVoiceTarget = null;
  
  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (e) {
      console.error('停止语音识别失败:', e);
    }
  }
  
  updateVoiceUI(false);
}

// 更新语音UI状态
function updateVoiceUI(recording) {
  ['answer', 'evaluate'].forEach(target => {
    const btn = document.getElementById('voice-btn-' + target);
    const status = document.getElementById('voice-status-' + target);
    
    if (recording && currentVoiceTarget === target) {
      if (btn) btn.classList.add('recording');
      if (status) {
        status.textContent = '正在聆听...';
        status.classList.add('recording');
      }
    } else {
      if (btn) btn.classList.remove('recording');
      if (status) {
        status.textContent = '';
        status.classList.remove('recording');
      }
    }
  });
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
  initPlayerInputs();
  updatePlayerEmotionsDisplay();
  initVoiceRecognition();
});
