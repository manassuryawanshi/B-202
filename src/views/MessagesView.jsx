import React, { useState, useEffect, useRef } from 'react';
import FlatmateAvatar from '../components/Avatars';
import { REACTION_TYPES, ReactionIcon } from '../components/ReactionIcons';
import { playHapticChime } from '../data/storage';
import MaterialIcon from '../components/MaterialIcon';

export default function MessagesView({
  currentUser,
  members,
  messages,
  onSendMessage,
  onReactMessage,
  onSendPoll,
  onVotePoll
}) {
  const [inputText, setInputText] = useState('');
  const [category, setCategory] = useState('general');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Poll Creation Modal State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Yes', 'No']);

  const messagesEndRef = useRef(null);

  // Quick suggestion chips
  const quickChips = [
    { text: 'Paid my electricity bill share.', cat: 'bills' },
    { text: 'Paid my rent share to Ujwal.', cat: 'bills' },
    { text: 'Cleaned the bathroom today.', cat: 'chores' },
    { text: 'Cleaned the balcony.', cat: 'chores' },
    { text: 'Going to the market, let me know if anyone needs anything.', cat: 'general' }
  ];

  // Oldest at top, newest at bottom
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Filter by category and search query
  const filteredMessages = sortedMessages.filter((m) => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (m.text || '').toLowerCase().includes(q);
      const matchSender = (m.senderName || '').toLowerCase().includes(q);
      const matchPoll = m.poll?.question?.toLowerCase().includes(q);
      return matchText || matchSender || matchPoll;
    }
    return true;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, filterCategory]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    playHapticChime('nudge');
    onSendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: inputText.trim(),
      category: category
    });
    setInputText('');
  };

  const handleChipClick = (chip) => {
    playHapticChime('click');
    setInputText(chip.text);
    setCategory(chip.cat);
  };

  // Poll Handlers
  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (val, index) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const handleCreatePollSubmit = (e) => {
    e.preventDefault();
    const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || validOptions.length < 2) {
      alert('Please provide a question and at least 2 options');
      return;
    }

    playHapticChime('success');
    onSendPoll(pollQuestion.trim(), validOptions);
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['Yes', 'No']);
  };

  // Group Messages by Day
  const getDateLabel = (dateString) => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="view-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '530px' }}>
      {/* Top Search & Filter Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {showSearch ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="ios-input"
                  style={{ padding: '6px 28px 6px 30px', fontSize: '13px', width: '100%', height: '32px' }}
                  placeholder="Search messages, polls or names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--ios-text-tertiary)' }} />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ios-text-tertiary)' }}
                  >
                    <MaterialIcon name="close" size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="ios-btn ios-btn-secondary ios-btn-sm"
                style={{ padding: '5px 9px', fontSize: '11.5px' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                Flat B-202 Chat
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setShowSearch(true)}
                  className="nav-icon-btn"
                  style={{ width: '32px', height: '32px' }}
                  title="Search Chat"
                >
                  <MaterialIcon name="search" size={16} />
                </button>
                <button
                  onClick={() => {
                    playHapticChime('click');
                    setShowPollModal(true);
                  }}
                  className="ios-btn ios-btn-secondary ios-btn-sm"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  title="Create Poll"
                >
                  <MaterialIcon name="poll" size={15} color="var(--ios-blue)" /> Poll
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Flat Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setFilterCategory('all')}
            className={`flat-filter-pill ${filterCategory === 'all' ? 'active' : ''}`}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilterCategory('bills')}
            className={`flat-filter-pill ${filterCategory === 'bills' ? 'active' : ''}`}
          >
            Bills & Rent
          </button>
          <button
            onClick={() => setFilterCategory('chores')}
            className={`flat-filter-pill ${filterCategory === 'chores' ? 'active' : ''}`}
          >
            Chores
          </button>
          <button
            onClick={() => setFilterCategory('urgent')}
            className={`flat-filter-pill ${filterCategory === 'urgent' ? 'active' : ''}`}
          >
            Urgent
          </button>
        </div>
      </div>

      {/* Message Feed (Sleek Apple Scrollbar, Oldest Top, Newest Bottom) */}
      <div
        className="apple-sleek-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '10px 2px 14px 2px'
        }}
      >
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--ios-text-tertiary)' }}>
            <MaterialIcon name="chat" size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div>No messages found.</div>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const sender = members.find((m) => m.id === msg.senderId);
            const isMe = msg.senderId === currentUser?.id;

            // Date divider check
            const currentDateLabel = getDateLabel(msg.timestamp);
            const prevMessage = idx > 0 ? filteredMessages[idx - 1] : null;
            const prevDateLabel = prevMessage ? getDateLabel(prevMessage.timestamp) : null;
            const showDateDivider = currentDateLabel !== prevDateLabel;

            return (
              <React.Fragment key={msg.id}>
                {/* Date Label Pill Divider (like WhatsApp/Apple) */}
                {showDateDivider && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
                    <span
                      style={{
                        background: 'var(--ios-card-inset, #EEF0F4)',
                        border: '1px solid var(--ios-card-border-soft, #E5E7EB)',
                        color: 'var(--ios-text-secondary)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {currentDateLabel}
                    </span>
                  </div>
                )}

                {/* Message Bubble or Interactive Poll */}
                <div
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    background: isMe ? 'var(--ios-blue-light, #EFF6FF)' : 'var(--ios-card, #FFFFFF)',
                    border: isMe ? '1px solid #BFDBFE' : '1px solid var(--ios-card-border)',
                    borderRadius: '18px',
                    borderBottomRightRadius: isMe ? '4px' : '18px',
                    borderBottomLeftRadius: isMe ? '18px' : '4px',
                    padding: '11px 14px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                    position: 'relative'
                  }}
                >
                  {/* Sender Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FlatmateAvatar
                        id={msg.senderId === 'system' ? 'owner' : sender?.id}
                        customAvatar={sender?.customAvatar}
                        size={20}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: isMe ? 'var(--ios-blue)' : 'var(--ios-text-primary)' }}>
                        {msg.senderName} {isMe && '(You)'}
                      </span>
                    </div>

                    <span style={{ fontSize: '10.5px', color: 'var(--ios-text-tertiary)' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* INTERACTIVE POLL RENDERING */}
                  {msg.poll ? (
                    <div style={{ margin: '4px 0' }}>
                      <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: '8px' }}>
                        {msg.poll.question}
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(() => {
                          const totalVotes = msg.poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);

                          return msg.poll.options.map((opt) => {
                            const optVotes = opt.votes?.length || 0;
                            const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                            const hasVoted = opt.votes?.includes(currentUser.id);

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  playHapticChime('click');
                                  onVotePoll(msg.id, opt.id);
                                }}
                                style={{
                                  position: 'relative',
                                  padding: '8px 12px',
                                  borderRadius: '12px',
                                  border: hasVoted ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                                  background: 'var(--ios-card)',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                {/* Fill Progress Bar */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${percentage}%`,
                                    background: hasVoted ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 0, 0, 0.05)',
                                    transition: 'width 0.25s ease'
                                  }}
                                />

                                <span style={{ position: 'relative', fontSize: '13px', fontWeight: hasVoted ? 800 : 600, color: 'var(--ios-text-primary)', zIndex: 1 }}>
                                  {hasVoted && <MaterialIcon name="check_circle" size={14} color="var(--ios-blue)" filled style={{ display: 'inline', marginRight: '5px' }} />}
                                  {opt.text}
                                </span>

                                <span style={{ position: 'relative', fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', zIndex: 1 }}>
                                  {percentage}% ({optVotes})
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* Standard text message */
                    <div style={{ fontSize: '13.5px', color: 'var(--ios-text-primary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                  )}

                  {/* Tapback Reactions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    {REACTION_TYPES.map((react) => {
                      const count = msg.reactions?.[react.id] || 0;
                      const isSelectedByMe = msg.userReactions?.[currentUser.id] === react.id;

                      return (
                        <button
                          key={react.id}
                          type="button"
                          onClick={() => {
                            playHapticChime('reaction');
                            onReactMessage(msg.id, react.id);
                          }}
                          style={{
                            background: isSelectedByMe ? react.bg : count > 0 ? 'var(--ios-card-inset)' : 'transparent',
                            border: isSelectedByMe ? `1.5px solid ${react.color}` : count > 0 ? '1px solid var(--ios-card-border)' : '1px solid var(--ios-card-border-soft)',
                            borderRadius: '12px',
                            padding: '3px 7px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transform: isSelectedByMe ? 'scale(1.05)' : 'none',
                            boxShadow: isSelectedByMe ? `0 1px 4px ${react.color}33` : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <ReactionIcon type={react.id} size={13} />
                          {count > 0 && (
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: isSelectedByMe ? react.color : 'var(--ios-text-secondary)' }}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips (NO SCROLLBAR) */}
      <div style={{ flexShrink: 0 }}>
        <div className="no-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px' }}>
          {quickChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="flat-quick-chip"
            >
              {chip.text}
            </button>
          ))}
        </div>
      </div>

      {/* Compose Input Bar */}
      <form
        onSubmit={handleSend}
        className="ios-card"
        style={{
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select
            className="ios-select"
            style={{ padding: '3px 8px', fontSize: '11.5px', width: 'auto' }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="general">General</option>
            <option value="bills">Bills</option>
            <option value="chores">Chores</option>
            <option value="urgent">Urgent</option>
          </select>
          <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
            Sending as <strong>{currentUser?.name}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            className="ios-input"
            style={{ flex: 1, padding: '9px 12px', fontSize: '14px' }}
            placeholder="Message flatmates or create poll..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            id="flat-chat-input"
          />

          <button
            type="submit"
            className="ios-btn ios-btn-primary"
            style={{ padding: '9px 14px' }}
            id="send-chat-msg-btn"
          >
            <MaterialIcon name="send" size={16} />
          </button>
        </div>
      </form>

      {/* CREATE POLL MODAL */}
      {showPollModal && (
        <div className="modal-backdrop" onClick={() => setShowPollModal(false)} style={{ zIndex: 110 }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab-bar" />
            <div className="sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MaterialIcon name="poll" size={22} color="var(--ios-blue)" />
                <h2 className="sheet-title">Create Flat Poll</h2>
              </div>
              <button className="sheet-close-btn" onClick={() => setShowPollModal(false)}>
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePollSubmit}>
              <div className="ios-input-group">
                <label className="ios-label">Question</label>
                <input
                  className="ios-input"
                  placeholder="e.g. Who wants dinner together tonight?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  required
                />
              </div>

              <div className="ios-input-group">
                <label className="ios-label">Options</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pollOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        className="ios-input"
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => handlePollOptionChange(e.target.value, i)}
                        required
                        style={{ flex: 1 }}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(i)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ios-red)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <MaterialIcon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ios-blue)',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '8px'
                    }}
                  >
                    <MaterialIcon name="add" size={15} /> Add another option
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  className="ios-btn ios-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowPollModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-btn ios-btn-primary"
                  style={{ flex: 2 }}
                >
                  Create & Post Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
