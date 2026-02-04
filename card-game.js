// ========== API Config ==========
const API_URL = "/api/chat";
const MODEL = "Qwen/Qwen2.5-72B-Instruct";

// ========== Game State ==========
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
let playerEmotions = {}; // Stores AI-analyzed player emotions
let lastAIAnalysis = null;
let analysisInProgress = false;
let selectedWildType = null; // Selected wild card type
let lastPlayerIndex = -1; // Used to determine whether to show switch animation

const avatars = ['&#128104;', '&#128105;', '&#129489;', '&#128116;', '&#128117;', '&#129490;'];
const avatarColors = ['#FFE0B2', '#F8BBD9', '#B3E5FC', '#C8E6C9', '#E1BEE7', '#FFCCBC'];
const defaultNames = ['Dad', 'Mom', 'Me', 'Grandpa', 'Grandma', 'Brother/Sister'];

const functionCardTypes = ['reverse', 'explain', 'avoid', 'wild'];

const cardTypes = {
  share: { name: 'Share Card', icon: '&#128172;', desc: 'Answer an AI-generated question', class: 'card-share' },
  evaluate: { name: 'Evaluate Card', icon: '&#128173;', desc: 'Give 2 strengths + 2 weaknesses', class: 'card-evaluate' },
  wish: { name: 'Wish Card', icon: '&#127775;', desc: 'Say and record a wish', class: 'card-wish' },
  reverse: { name: 'Reverse Card', icon: '&#128260;', desc: 'Make the card player answer', class: 'card-reverse' },
  explain: { name: 'Clarify Card', icon: '&#128226;', desc: 'Ask the next player to clarify', class: 'card-explain' },
  avoid: { name: 'Avoid Card', icon: '&#128584;', desc: 'Skip answering the current question', class: 'card-avoid' },
  wild: { name: 'Wild Card', icon: '&#10024;', desc: 'Transform into a card and use it', class: 'card-wild' }
};

// Deep question topics
const topicTrees = {
  happiness: {
    name: 'Happy Moments',
    questions: [
      'What did you eat recently that felt like comfort?',
      'When was the last time you felt truly cared for, and why?',
      'Do you have a small "joy switch" that always lifts your mood?'
    ],
    counter : 0
   },
  gratitude: {
    name: 'Gratitude',
    questions: [
      'Who do you most want to thank this year?',
      'Have you received any gentle help lately?',
      'Is there a place that makes you feel relaxed and at home?'
    ],
    counter : 0
  },
  family: {
    name: 'Family Warmth',
    questions: [
      'What small strength of a family member do you really admire?',
      'Which way your family shows care feels most meaningful to you?',
      'Is there something kind you want to say but have not yet?'
    ],
    counter : 0
  },
  growth: {
    name: 'Growth & Insight',
    questions: [
      'What has been your biggest recent growth or takeaway?',
      'When did you notice a small improvement in yourself?',
      'What small thing recently made you feel accomplished?'
    ],
    counter : 0
  },
  unsaid: {
    name: 'Unsaid Words',
    questions: [
      'Is there something you want to say to your family but have not yet?',
      'What usually makes it hard to say certain things?',
      'Right now, would you like to say something you have not dared to?'
    ],
    counter : 0
      },
   pressure: {
    name: 'Pressure & Release',
     questions: [
       'What has been the biggest source of stress lately?',
       'If you gave your current state a gentle label, what would it be?',
       'What gentle feeling shows up most often in your emotions lately?'
    ],
        counter : 0
  }
};

// ========== Navigation ==========
function showPage(pageId) {
  console.log('Switching to page:', pageId);
  
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show target page
  const nextPage = document.getElementById('page-' + pageId);
  if (nextPage) {
    nextPage.classList.add('active');
    console.log('Page activated:', pageId);
  } else {
    console.error('Page not found:', pageId);
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
    console.log('Not all players confirmed, aborting');
    return;
  }
  // Skip function-card selection page and start game
  startGame();
}
function goToGame() { showPage('game'); }
function goToSummary() {
  showPage('summary');
  generateAISummary();
}

// ========== Setup Page ==========
function initPlayerInputs() {
  const container = document.getElementById('player-inputs');
  container.innerHTML = '';
  
  for (let i = 0; i < playerCount; i++) {
    container.innerHTML += `
      <div class="player-input">
        <div class="player-avatar" style="background: ${avatarColors[i]}">${avatars[i]}</div>
        <input type="text" id="player${i+1}" placeholder="Player ${i+1} (e.g., ${defaultNames[i]})">
      </div>
    `;
  }
}

function setPlayerCount(count) {
  playerCount = count;
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.classList.remove('active');
    if (Number(btn.dataset.count) === count) btn.classList.add('active');
  });
  initPlayerInputs();
}

function initPlayers() {
  players = [];
  for (let i = 0; i < playerCount; i++) {
    const input = document.getElementById(`player${i+1}`);
    const name = input ? input.value.trim() || `Player ${i+1}` : `Player ${i+1}`;
    players.push({
      name: name,
      avatar: avatars[i],
      color: avatarColors[i],
      cards: [],
      functionCards: [],
      active: true
    });
    playerEmotions[name] = { emoji: '&#128566;', word: 'Waiting' };
  }
}

// ========== Rules Page ==========
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
    btn.textContent = 'All confirmed, start game';
  } else {
    btn.disabled = true;
    btn.textContent = `${players.length - confirmedPlayers.length} more to confirm`;
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

// ========== Function Card Selection ==========
function renderCardSelection() {
  const player = players[cardSelectingPlayer];
  selectedFunctionCards = [];
  
  document.getElementById('selector-avatar').innerHTML = player.avatar;
  document.getElementById('selector-avatar').style.background = player.color;
  document.getElementById('selector-name').textContent = player.name;
  document.getElementById('card-select-hint').textContent = `${player.name}, pick 2 function cards`;
  
  // Render function cards first
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
  
  // Update progress after DOM elements exist
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
  document.getElementById('selector-progress').textContent = `Selected ${selectedFunctionCards.length}/2`;
  
  const btn = document.getElementById('btn-confirm-cards');
  btn.disabled = selectedFunctionCards.length !== 2;
  btn.textContent = selectedFunctionCards.length === 2 ? 'Confirm selection' : `Select ${2 - selectedFunctionCards.length} more`;
  
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

// ========== Game Logic ==========
function startGame() {
  playDirection = 1;
  wishCardGiven = false;
  records = [];
  wishes = [];
  round = 1;
  currentPlayerIndex = 0;
  lastPlayerIndex = -1;
  
  // Random dealing strategy
  distributeCards();
  
  pendingCard = null;
  showPage('game');
  updateGameUI();
}

// Random deal
function distributeCards() {
  const playerNum = players.length;
  const contentPerPlayer = 3; // 3 content cards per player
  const functionPerPlayer = 2; // 2 function cards per player
  
  // Build content pool (only one wish card in game)
  let contentPool = [];
  const totalContentNeeded = playerNum * contentPerPlayer;
  // 1 wish card, rest split between share/evaluate
  const remainingContent = totalContentNeeded - 1;
  const shareCount = Math.ceil(remainingContent / 2);
  const evaluateCount = remainingContent - shareCount;
  
  contentPool.push({ type: 'wish' }); // single wish card
  for (let i = 0; i < shareCount; i++) {
    contentPool.push({ type: 'share' });
  }
  for (let i = 0; i < evaluateCount; i++) {
    contentPool.push({ type: 'evaluate' });
  }
  
  // Build function pool (only one wild card in game)
  let functionPool = [];
  const totalFunctionNeeded = playerNum * functionPerPlayer;
  // 1 wild card, rest split among reverse/explain/avoid
  const remainingFunction = totalFunctionNeeded - 1;
  const perTypeCount = Math.floor(remainingFunction / 3);
  const extraCards = remainingFunction % 3;
  
  functionPool.push({ type: 'wild' }); // single wild card
  for (let i = 0; i < perTypeCount + (extraCards > 0 ? 1 : 0); i++) {
    functionPool.push({ type: 'reverse' });
  }
  for (let i = 0; i < perTypeCount + (extraCards > 1 ? 1 : 0); i++) {
    functionPool.push({ type: 'explain' });
  }
  for (let i = 0; i < perTypeCount; i++) {
    functionPool.push({ type: 'avoid' });
  }
  
  // Shuffle (Fisher-Yates)
  shuffleArray(contentPool);
  shuffleArray(functionPool);
  
  // Deal each player: 3 content cards + 2 function cards
  players.forEach(player => {
    player.cards = [];
    playerEmotions[player.name] = { emoji: '&#128566;', word: 'Waiting' };
    
    // Deal 3 content cards
    for (let i = 0; i < contentPerPlayer && contentPool.length > 0; i++) {
      player.cards.push(contentPool.pop());
    }
    
    // Deal 2 function cards
    for (let i = 0; i < functionPerPlayer && functionPool.length > 0; i++) {
      player.cards.push(functionPool.pop());
    }
    
    // Shuffle hand
    shuffleArray(player.cards);
  });
  
  console.log('Dealing complete, player hands:', players.map(p => ({name: p.name, cards: p.cards.map(c => c.type)})));
}

// Shuffle (Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function updateGameUI() {
  const current = players[currentPlayerIndex];
  
  // Check if we should show the player switch animation
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

// Normal action area (no pending card)
function showNormalActionArea() {
  document.getElementById('action-area').style.display = 'block';
  document.getElementById('action-title').textContent = 'Choose a card to play';
  document.getElementById('question-display').style.display = 'none';
  
  const btnGroup = document.querySelector('#action-area .btn-group');
  btnGroup.innerHTML = `
    <button class="btn btn-primary" id="btn-confirm" onclick="confirmPlay()" disabled>Confirm play</button>
    <button class="btn btn-accent" onclick="nextTurn()">End turn</button>
  `;
}

// Show player switch animation
function showTurnAnimation(player) {
  const overlay = document.getElementById('turn-overlay');
  document.getElementById('turn-avatar').innerHTML = player.avatar;
  document.getElementById('turn-avatar').style.background = player.color;
  document.getElementById('turn-text').textContent = `It is ${player.name}'s turn`;
  
  overlay.classList.add('show');
  
  // Auto-close after 2 seconds
  setTimeout(() => {
    overlay.classList.remove('show');
  }, 2000);
  
  // Click anywhere to close
  overlay.onclick = () => {
    overlay.classList.remove('show');
  };
}

function updatePlayersBar() {
  const bar = document.getElementById('players-bar');
  bar.innerHTML = players.map((p, i) => {
    const emotion = playerEmotions[p.name] || { emoji: '&#128566;', word: 'Waiting' };
    return `
      <div class="player-chip ${!p.active ? 'inactive' : ''} ${i === currentPlayerIndex ? 'current' : ''}">
        <div class="chip-avatar" style="background: ${p.color}">${p.avatar}</div>
        <div class="chip-info">
          <div class="chip-name">${p.name}</div>
          <div class="chip-status">${p.active ? p.cards.length + ' cards' : 'Spectating'}</div>
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
    alert('Please resolve the received card first.');
    return;
  }
  
  const current = players[currentPlayerIndex];
  const card = current.cards[index];
  
  // Avoid and Reverse cannot be played proactively
  if (card.type === 'avoid') {
    alert('Avoid Card can only be used when you receive a Share or Evaluate card.');
    return;
  }
  if (card.type === 'reverse') {
    alert('Reverse Card can only be used when you receive a Share or Evaluate card.');
    return;
  }
  
  // Wish card is self-use
  if (card.type === 'wish') {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    document.getElementById('card-' + index).classList.add('selected');
    selectedCard = index;
    
    const type = cardTypes[card.type];
    document.getElementById('action-area').style.display = 'block';
    document.getElementById('action-title').textContent = `Selected: ${type.name}`;
    document.getElementById('btn-confirm').textContent = 'Make a wish';
    document.getElementById('btn-confirm').disabled = false;
    document.getElementById('btn-confirm').onclick = executeWishCard;
    
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = 'Say one wish. The wish card will be randomly passed to another player.';
    return;
  }
  
  // Wild card is self-use
  if (card.type === 'wild') {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    document.getElementById('card-' + index).classList.add('selected');
    selectedCard = index;
    
    const type = cardTypes[card.type];
    document.getElementById('action-area').style.display = 'block';
    document.getElementById('action-title').textContent = `Selected: ${type.name}`;
    document.getElementById('btn-confirm').textContent = 'Use Wild Card';
    document.getElementById('btn-confirm').disabled = false;
    document.getElementById('btn-confirm').onclick = useWildCard;
    
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = 'Transform into: Share / Evaluate / Clarify / Reverse / Avoid';
    return;
  }
  
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
  document.getElementById('card-' + index).classList.add('selected');
  selectedCard = index;
  
  const type = cardTypes[card.type];
  const nextPlayer = getNextActivePlayer();
  
  document.getElementById('action-area').style.display = 'block';
  document.getElementById('action-title').textContent = `Selected: ${type.name}`;
  document.getElementById('btn-confirm').textContent = `Send to ${nextPlayer.name}`;
  document.getElementById('btn-confirm').disabled = false;
  document.getElementById('btn-confirm').onclick = confirmPlay;
  
  document.getElementById('question-display').style.display = 'block';
  document.getElementById('question-type').textContent = type.name;
  document.getElementById('question-text').textContent = `${nextPlayer.name} will: ${type.desc}`;
}

// Execute Wish card (self-use)
function executeWishCard() {
  if (selectedCard === null) return;
  
  const current = players[currentPlayerIndex];
  
  // Remove wish card
  current.cards.splice(selectedCard, 1);
  selectedCard = null;
  
  // Show wish input modal
  showAnswerModal('Share one wish.', 'Wish Moment', '&#127775;');
}

// Use Wild card (open selection modal)
function useWildCard() {
  if (selectedCard === null) return;
  
// Show wild card selection modal (all available types)
  showWildCardModal();
}

// Show wild card modal (5 fixed types)
function showWildCardModal() {
  selectedWildType = null;
  
  // Fixed transform options (no wish or wild)
  const availableTypes = ['share', 'evaluate', 'explain', 'reverse', 'avoid'];
  
  // Render options
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
  document.getElementById('action-title').textContent = `${pendingCard.fromPlayer} sent you a card`;
  document.getElementById('btn-confirm').textContent = 'Play this card';
  document.getElementById('btn-confirm').disabled = false;
  document.getElementById('btn-confirm').onclick = executePendingCard;
  
  // Only allow Avoid/Reverse on Share or Evaluate
  const hasAvoidCard = current.cards.some(c => c.type === 'avoid');
  const hasReverseCard = current.cards.some(c => c.type === 'reverse');
  const canUseResponseCard = pendingCard.type === 'share' || pendingCard.type === 'evaluate';
  
  // Update buttons based on available response cards
  const btnGroup = document.querySelector('#action-area .btn-group');
  let buttonsHtml = '<button class="btn btn-primary" id="btn-confirm" onclick="executePendingCard()">Play this card</button>';
  
  if (canUseResponseCard && hasReverseCard) {
    buttonsHtml += '<button class="btn btn-secondary" onclick="useReverseCard()">Use Reverse Card</button>';
  }
  if (canUseResponseCard && hasAvoidCard) {
    buttonsHtml += '<button class="btn btn-secondary" onclick="useAvoidCard()">Use Avoid Card</button>';
  }
  
  btnGroup.innerHTML = buttonsHtml;
  
  if (pendingCard.type === 'share') {
    // Only generate a new question if missing (keep original for Reverse)
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
    document.getElementById('question-text').textContent = 'Share one wish.';
  } else if (pendingCard.type === 'evaluate') {
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = 'Evaluate a player at the table.';
  } else {
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('question-type').textContent = type.name;
    document.getElementById('question-text').textContent = type.desc;
  }
}

// Use Reverse card - sender must answer
function useReverseCard() {
  const current = players[currentPlayerIndex];
  const reverseIndex = current.cards.findIndex(c => c.type === 'reverse');
  
  if (reverseIndex === -1) {
    alert('You do not have a Reverse Card.');
    return;
  }
  
  // Remove Reverse card (no new card added)
  current.cards.splice(reverseIndex, 1);
  
  // Record Reverse card usage
  addRecord(current.name, 'Reverse Card', `Reversed ${cardTypes[pendingCard.type].name} to ${pendingCard.fromPlayer}`);
  
  // Check for end game
  if (checkGameEnd()) return;
  
  // Send back to original sender
  const originalFromPlayerIndex = pendingCard.fromPlayerIndex;
  
  // Keep original question
  const savedQuestion = pendingCard.question;
  const savedTopicName = pendingCard.topicName;
  
  // Update pendingCard sender to current player
  pendingCard.fromPlayer = current.name;
  pendingCard.fromPlayerIndex = currentPlayerIndex;
  pendingCard.question = savedQuestion;
  pendingCard.topicName = savedTopicName;
  
  // Switch to original sender
  currentPlayerIndex = originalFromPlayerIndex;
  
  // Update UI
  updateGameUI();
}

// Use Avoid card
function useAvoidCard() {
  const current = players[currentPlayerIndex];
  const avoidIndex = current.cards.findIndex(c => c.type === 'avoid');
  
  if (avoidIndex === -1) {
    alert('You do not have an Avoid Card.');
    return;
  }
  
  // Remove Avoid card (no new card added)
  current.cards.splice(avoidIndex, 1);
  
  // Record Avoid card usage
  addRecord(current.name, 'Avoid Card', 'Chose not to answer this question.');
  
  // Check for end game
  if (checkGameEnd()) return;
  
  // Clear pending card and continue
  pendingCard = null;
  nextTurn();
}

function executePendingCard() {
  if (!pendingCard) return;
  
  switch (pendingCard.type) {
    case 'share':
      showAnswerModal(pendingCard.question, 'Share Moment', '&#128172;');
      break;
    case 'evaluate':
      showEvaluateModal();
      break;
    case 'wish':
      showAnswerModal('Share one wish.', 'Wish Moment', '&#127775;');
      break;
    case 'reverse':
      handleReverseCard();
      break;
    case 'avoid':
      handleAvoidCard();
      break;
    case 'explain':
      showAnswerModal('Please add or clarify what you mean.', 'Clarify Moment', '&#128226;');
      break;
    case 'wild':
      handleWildCard();
      break;
    default:
      showAnswerModal(`Use ${cardTypes[pendingCard.type].name}`, cardTypes[pendingCard.type].name, cardTypes[pendingCard.type].icon);
  }
}

function handleReverseCard() {
  // Reverse card cannot be executed here; only as a response
  alert('Reverse Card can only be used when you receive a Share or Evaluate card.');
}

function handleAvoidCard() {
  // Avoid card cannot be executed here; only as a response
  alert('Avoid Card can only be used when you receive a Share or Evaluate card.');
}

function handleWildCard() {
  // Show wild card selection modal
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
  
  // Remove Wild card
  current.cards.splice(selectedCard, 1);
  
  // Record Wild card use
  addRecord(current.name, 'Wild Card', `Transformed into ${cardTypes[selectedWildType].name}`);
  
  // Check for end game
  if (checkGameEnd()) return;
  
  selectedCard = null;
  
  // After transform, Wild card is self-use
  switch (selectedWildType) {
    case 'share':
      showAnswerModal(getRandomQuestion().text, 'Share Moment', '&#128172;');
      break;
    case 'evaluate':
      // Evaluate card: self-evaluate others
      showSelfEvaluateModal();
      break;
    case 'explain':
      showAnswerModal('Please add or clarify what you mean.', 'Clarify Moment', '&#128226;');
      break;
    case 'reverse':
    case 'avoid':
      // Reverse/Avoid are response cards; add to hand
      current.cards.push({ type: selectedWildType });
      alert(`Wild Card became ${cardTypes[selectedWildType].name} and was added to your hand.`);
      updateGameUI();
      break;
  }
  
  selectedWildType = null;
}

// Evaluate modal when self-using Evaluate card
function showSelfEvaluateModal() {
  // Get other players
  const otherPlayers = players.filter((p, i) => i !== currentPlayerIndex && p.active);
  if (otherPlayers.length === 0) {
    alert('No other players to evaluate.');
    updateGameUI();
    return;
  }
  
  // Pick a random player to evaluate
  const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
  document.getElementById('evaluate-target-name').textContent = targetPlayer.name;
  document.getElementById('evaluate-content').value = '';
  
  // Mark as self-use
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
  
  // Check for end game
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
  const evaluateTarget = pendingCard ? pendingCard.fromPlayer : 'someone';
  document.getElementById('evaluate-target-name').textContent = evaluateTarget;
  document.getElementById('evaluate-content').value = '';
  document.getElementById('modal-evaluate').classList.add('show');
}

function submitAnswer() {
  const content = document.getElementById('modal-input').value.trim();
  if (!content) {
    alert('Please enter something.');
    return;
  }
  
  // Stop voice recording
  stopVoiceRecording();
  
  const current = players[currentPlayerIndex];
  const cardType = pendingCard ? pendingCard.type : 'share';
  const type = cardTypes[cardType];
  
  // Check if this is a self-use Wish card
  const isWishFromSelf = !pendingCard && document.getElementById('modal-title').textContent === 'Wish Moment';
  
  // Check if Wild card transformed to Share or Clarify and is self-use
  const isWildSelfUse = !pendingCard && (
    document.getElementById('modal-title').textContent === 'Share Moment' ||
    document.getElementById('modal-title').textContent === 'Clarify Moment'
  );
  
  if (cardType === 'wish' || isWishFromSelf) {
    wishes.push({ player: current.name, wish: content });
    addRecord(current.name, 'Wish Card', `Made a wish: ${content}`);
    // Wish card is consumed
    alert('Wish recorded! It will appear in the end summary.');
  } else if (isWildSelfUse) {
    const modalTitle = document.getElementById('modal-title').textContent;
    const cardName = modalTitle === 'Share Moment' ? 'Share Card' : 'Clarify Card';
    addRecord(current.name, cardName, content);
  } else {
    addRecord(current.name, type.name, content);
  }
  
  document.getElementById('modal-answer').classList.remove('show');
  
  // Trigger AI analysis
  triggerAIAnalysis();
  
  // If self-use Wish/Wild, update UI directly
  if (isWishFromSelf || isWildSelfUse) {
    // Check for end game
    if (checkGameEnd()) return;
    updateGameUI();
  } else {
    clearPendingAndNext();
  }
}

function submitEvaluate() {
  const content = document.getElementById('evaluate-content').value.trim();
  if (!content) {
    alert('Please enter your evaluation.');
    return;
  }
  
  // Stop voice recording
  stopVoiceRecording();
  
  const current = players[currentPlayerIndex];
  
  // Check if self-use Evaluate card (from Wild card)
  const isSelfUse = pendingCard && pendingCard.selfUse;
  
  if (isSelfUse) {
    const targetName = pendingCard.targetPlayer;
    addRecord(current.name, 'Evaluate Card', `To ${targetName}: ${content}`);
    pendingCard = null;
  } else {
    const evaluateTarget = pendingCard ? pendingCard.fromPlayer : 'someone';
    addRecord(current.name, 'Evaluate Card', `To ${evaluateTarget}: ${content}`);
  }
  
  document.getElementById('modal-evaluate').classList.remove('show');
  
  // Trigger AI analysis
  triggerAIAnalysis();
  
  // If self-use, update UI directly
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
  // Wish card is self-use and already handled
  return;
}

// Check end of game (any player empties hand)
function checkGameEnd() {
  const emptyHandPlayer = players.find(p => p.active && p.cards.length === 0);
  if (emptyHandPlayer) {
    // Show game end message
    setTimeout(() => {
      alert(`${emptyHandPlayer.name} has no cards left. Game over!\nOpening the conversation summary...`);
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
    container.innerHTML = '<div class="empty-records">No records yet. Start playing!</div>';
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

// ========== AI Analysis ==========
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
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
}

async function triggerAIAnalysis() {
  if (analysisInProgress || records.length === 0) return;
  analysisInProgress = true;
  
  document.getElementById('ai-insight').innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI analyzing...</span></div>';
  
  const recentRecords = records.slice(-10).map(r => `${r.player}(${r.card}): ${r.content}`).join('\n');
  const playerNames = players.map(p => p.name).join(', ');
  
  const prompt = `You are a professional family conversation analyst. Analyze the dialogue below and complete two tasks.

Participants: ${playerNames}

Recent dialogue:
${recentRecords}

Task 1: For each participant, summarize their current emotional state in one word (e.g., happy, touched, thoughtful, nervous, relaxed, hopeful, grateful, hesitant).

Task 2: Provide a short insight (2-3 sentences) in a light, humorous tone about the current vibe and what is worth noticing.

Reply strictly in this JSON format (no extra text):
{
  "emotions": {
    "Player1": {"emoji": "emoji", "word": "one word"},
    "Player2": {"emoji": "emoji", "word": "one word"}
  },
  "insight": "insight text"
}

Emoji references: happy &#128522;, touched &#129402;, thoughtful &#129300;, nervous &#128556;, relaxed &#128524;, hopeful &#129321;, grateful &#128591;, hesitant &#128533;`;
  
  const messages = [
    { role: "system", content: "You are a professional family conversation analyst. Always reply in JSON." },
    { role: "user", content: prompt }
  ];
  
  const result = await callAPI(messages);
  
  if (result) {
    try {
      // Try to parse JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Update player emotions
        if (analysis.emotions) {
          Object.keys(analysis.emotions).forEach(name => {
            if (playerEmotions[name]) {
              playerEmotions[name] = analysis.emotions[name];
            }
          });
          updatePlayerEmotionsDisplay();
          updatePlayersBar();
        }
        
        // Update insight
        if (analysis.insight) {
          document.getElementById('ai-insight').textContent = analysis.insight;
        }
        
        lastAIAnalysis = analysis;
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      document.getElementById('ai-insight').textContent = 'Analyzing the conversation. Please keep playing...';
    }
  } else {
    document.getElementById('ai-insight').textContent = 'Conversation in progress. AI is observing...';
  }
  
  analysisInProgress = false;
}

function updatePlayerEmotionsDisplay() {
  const container = document.getElementById('player-emotions');
  container.innerHTML = players.map(p => {
    const emotion = playerEmotions[p.name] || { emoji: '&#128566;', word: 'Waiting' };
    return `
      <div class="player-emotion-card">
        <div class="player-emotion-name">${p.name}</div>
        <div class="player-emotion-emoji">${emotion.emoji}</div>
        <div class="player-emotion-word">${emotion.word}</div>
      </div>
    `;
  }).join('');
}

// ========== AI Summary ==========
async function generateAISummary() {
  const container = document.getElementById('summary-content');
  container.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI is generating the summary...</span></div>';
  
  if (records.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">No records yet. Play a few rounds first.</p>';
    return;
  }
  
  const allRecords = records.map(r => `${r.player}(${r.card}): ${r.content}`).join('\n');
  const playerNames = players.map(p => p.name).join(', ');
  const wishList = wishes.map(w => `${w.player}'s wish: ${w.wish}`).join('\n') || 'No wishes yet';
  
  const prompt = `You are a professional family conversation analyst and counselor. Create a warm, insightful summary of this deep conversation game.

Participants: ${playerNames}
Rounds played: ${round}
Wish pool:
${wishList}

Full dialogue:
${allRecords}

Write a summary with the following four sections. Do not include the section titles themselves (the titles are only for guidance):

Conversation Overview: Briefly describe the overall conversation (2-3 sentences).

Per-Participant Analysis:
- The traits each participant showed in the conversation
- The core emotions and thoughts they expressed
- One warm affirmation for each person

Family Relationship Insights:
- Relationship patterns observed
- Moments worth cherishing
- Areas that may need more care

Encouragement & Suggestions:
- Genuine encouragement for the family
- Communication ideas to try next

Use a warm, sincere, insightful tone so participants feel understood and supported.`;
  
  const messages = [
    { role: "system", content: "You are a professional family conversation analyst and counselor. Produce warm, insightful summaries with affirmations." },
    { role: "user", content: prompt }
  ];
  
  const result = await callAPI(messages);
  
  // Build wish pool HTML (above summary)
  const wishPoolHtml = wishes.length > 0 
    ? `<div class="wish-pool-card">
        <div class="wish-pool-title">&#127775; Wish Pool</div>
        <div class="wish-pool-list">
          ${wishes.map(w => `<div class="wish-item">&#127775; ${w.player}'s wish: ${w.wish}</div>`).join('')}
        </div>
      </div>`
    : '';
  
  if (result) {
    container.innerHTML = `
      ${wishPoolHtml}
      
      <div class="summary-card">
        <div class="summary-title">Conversation Summary</div>
        <div class="summary-section">
          <div class="ai-summary-text">${result.replace(/\n/g, '<br>')}</div>
        </div>
      </div>
      
      <div class="encouragement-card">
        <div class="encouragement-title">&#127775; Session Stats</div>
        <div class="encouragement-text">
          Players: ${players.length}<br>
          Rounds: ${round}<br>
          Records: ${records.length}<br>
          Wishes: ${wishes.length}
        </div>
      </div>
    `;
  } else {
    // Build local summary
    container.innerHTML = generateLocalSummary();
  }
}

function generateLocalSummary() {
  const emotionSummary = players.map(p => {
    const emotion = playerEmotions[p.name] || { emoji: '&#128566;', word: 'Waiting' };
    return `<div>${p.avatar} ${p.name}: ${emotion.emoji} ${emotion.word}</div>`;
  }).join('');
  
  // Wish pool on top
  const wishPoolHtml = wishes.length > 0 
    ? `<div class="wish-pool-card">
        <div class="wish-pool-title">&#127775; Wish Pool</div>
        <div class="wish-pool-list">
          ${wishes.map(w => `<div class="wish-item">&#127775; ${w.player}'s wish: ${w.wish}</div>`).join('')}
        </div>
      </div>`
    : '';
  
  return `
    ${wishPoolHtml}
    
    <div class="summary-card">
      <div class="summary-title">&#128202; Session Summary</div>
      
      <div class="summary-section">
        <div class="summary-section-title">&#127919; Conversation Overview</div>
        <div class="summary-list">
          This session had ${round} rounds. ${players.length} players contributed ${records.length} entries.
        </div>
      </div>
      
      <div class="summary-section">
        <div class="summary-section-title">&#128173; Participant Status</div>
        <div class="summary-list">${emotionSummary}</div>
      </div>
    </div>
    
    <div class="encouragement-card">
      <div class="encouragement-title">&#127775; Keep Going</div>
      <div class="encouragement-text">
        Thank you for taking the time to connect in this way.<br><br>
        Every honest share is a chance to strengthen your relationships.<br><br>
        Hope today becomes a warm memory you can return to.
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

// ========== Voice Recognition ==========
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceRecognition = null;
let isVoiceRecording = false;
let currentVoiceTarget = null; // 'answer' or 'evaluate'

// Initialize voice recognition
function initVoiceRecognition() {
  if (!SpeechRecognition) {
    console.log('Speech recognition not supported');
    // Hide voice buttons
    document.querySelectorAll('.voice-btn').forEach(btn => {
      btn.style.display = 'none';
    });
    return;
  }
  
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = 'en-US';
  
  voiceRecognition.onstart = function() {
    isVoiceRecording = true;
    updateVoiceUI(true);
  };
  
  voiceRecognition.onend = function() {
    if (isVoiceRecording) {
      // If still recording, auto-restart
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
    
    // Get target input
    const targetInput = currentVoiceTarget === 'answer' 
      ? document.getElementById('modal-input')
      : document.getElementById('evaluate-content');
    
    if (targetInput) {
      // Append final text
      if (finalTranscript) {
        targetInput.value += finalTranscript;
      }
      
      // Show interim status
      const statusEl = document.getElementById('voice-status-' + currentVoiceTarget);
      if (statusEl && interimTranscript) {
        statusEl.textContent = 'Listening: ' + interimTranscript;
        statusEl.classList.add('recording');
      }
    }
  };
  
  voiceRecognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
    
    const statusEl = currentVoiceTarget 
      ? document.getElementById('voice-status-' + currentVoiceTarget)
      : null;
    
    switch(event.error) {
      case 'no-speech':
        // Silent
        break;
      case 'audio-capture':
        if (statusEl) statusEl.textContent = 'Microphone not detected.';
        stopVoiceRecording();
        break;
      case 'not-allowed':
        if (statusEl) statusEl.textContent = 'Please allow microphone access.';
        stopVoiceRecording();
        break;
      default:
        if (statusEl) statusEl.textContent = 'Recognition failed. Please try again.';
        stopVoiceRecording();
    }
  };
}

// Toggle voice input
function toggleVoiceInput(target) {
  if (!SpeechRecognition) {
    alert('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
    return;
  }
  
  if (isVoiceRecording && currentVoiceTarget === target) {
    stopVoiceRecording();
  } else {
    // Stop other target first
    if (isVoiceRecording) {
      stopVoiceRecording();
    }
    startVoiceRecording(target);
  }
}

// Start voice recording
function startVoiceRecording(target) {
  if (!voiceRecognition) {
    initVoiceRecognition();
  }
  
  currentVoiceTarget = target;
  
  const statusEl = document.getElementById('voice-status-' + target);
  if (statusEl) {
    statusEl.textContent = 'Listening...';
    statusEl.classList.add('recording');
  }
  
  try {
    voiceRecognition.start();
  } catch (e) {
    console.error('Failed to start recognition:', e);
  }
}

// Stop voice recording
function stopVoiceRecording() {
  isVoiceRecording = false;
  currentVoiceTarget = null;
  
  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (e) {
      console.error('Failed to stop recognition:', e);
    }
  }
  
  updateVoiceUI(false);
}

// Update voice UI state
function updateVoiceUI(recording) {
  ['answer', 'evaluate'].forEach(target => {
    const btn = document.getElementById('voice-btn-' + target);
    const status = document.getElementById('voice-status-' + target);
    
    if (recording && currentVoiceTarget === target) {
      if (btn) btn.classList.add('recording');
      if (status) {
        status.textContent = 'Listening...';
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

// ========== Init ==========
document.addEventListener('DOMContentLoaded', function() {
  initPlayerInputs();
  updatePlayerEmotionsDisplay();
  initVoiceRecognition();
});
