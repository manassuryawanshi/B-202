import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  onVotePoll,
  onTypingChange
}) {
  const [inputText, setInputText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Poll Creation Modal State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Yes', 'No']);

  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);

  // Quick suggestion chips
  const quickChips = [
    { text: 'Paid my electricity bill share.', cat: 'bills' },
    { text: 'Paid my rent share to Ujwal.', cat: 'bills' },
    { text: 'Cleaned the bathroom today.', cat: 'chores' },
    { text: 'Cleaned the balcony.', cat: 'chores' },
    { text: 'Going to the market, let me know if anyone needs anything.', cat: 'general' }
  ];

  // Oldest at top, newest at bottom
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messages]);

  // Category filter
  const categoryMessages = useMemo(() => {
    if (filterCategory === 'all') return sortedMessages;
    return sortedMessages.filter((m) => m.category === filterCategory);
  }, [sortedMessages, filterCategory]);

  // Search matches array
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return categoryMessages.filter((m) => {
      const matchText = (m.text || '').toLowerCase().includes(q);
      const matchSender = (m.senderName || '').toLowerCase().includes(q);
      const matchPollQ = m.poll?.question?.toLowerCase().includes(q);
      const matchPollOpts = m.poll?.options?.some((o) => o.text.toLowerCase().includes(q));
      return matchText || matchSender || matchPollQ || matchPollOpts;
    });
  }, [categoryMessages, searchQuery]);

  // Reset active match index when query changes
  useEffect(() => {
    setActiveMatchIndex(0);
    if (searchMatches.length > 0) {
      scrollToMessage(searchMatches[0].id);
    }
  }, [searchQuery, searchMatches.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!showSearch) {
      scrollToBottom();
    }
  }, [messages.length, filterCategory, showSearch]);

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`whatsapp-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    playHapticChime('click');
    const nextIdx = (activeMatchIndex + 1) % searchMatches.length;
    setActiveMatchIndex(nextIdx);
    scrollToMessage(searchMatches[nextIdx].id);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    playHapticChime('click');
    const prevIdx = (activeMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setActiveMatchIndex(prevIdx);
    scrollToMessage(searchMatches[prevIdx].id);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    playHapticChime('nudge');
    onSendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: inputText.trim(),
      category: 'general'
    });
    setInputText('');
  };

  const handleChipClick = (chip) => {
    playHapticChime('click');
    setInputText(chip.text);
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

  // Highlight characters / words helper
  const renderHighlightedText = (text, isCurrentActiveMatch) => {
    if (!text) return null;
    if (!searchQuery.trim()) return text;

    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.toLowerCase() === searchQuery.toLowerCase()) {
        return (
          <mark
            key={i}
            className={isCurrentActiveMatch ? 'search-match-active' : 'search-match-text'}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div
      className="view-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 150px)',
        minHeight: '560px',
        padding: '0 4px',
        position: 'relative'
      }}
    >
      {/* IN-LINE HEADER: Search, Poll, and Category Chips in ONE Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 2px 8px 2px',
          flexShrink: 0
        }}
      >
        {showSearch ? (
          /* WhatsApp Style Search Bar with Match Navigation (1 of 5, ▲, ▼, ✕) */
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--ios-card)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: '20px',
              padding: '3px 8px 3px 10px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              animation: 'modalFadeIn 0.15s ease-out'
            }}
          >
            <MaterialIcon name="search" size={18} color="var(--ios-text-tertiary)" />
            <input
              ref={searchInputRef}
              type="text"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13.5px',
                color: 'var(--ios-text-primary)',
                padding: '4px 0'
              }}
              placeholder="Search words or names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />

            {searchQuery.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: searchMatches.length > 0 ? 'var(--ios-blue)' : 'var(--ios-text-tertiary)',
                    whiteSpace: 'nowrap',
                    padding: '0 4px'
                  }}
                >
                  {searchMatches.length > 0 ? `${activeMatchIndex + 1} of ${searchMatches.length}` : '0 results'}
                </span>

                {searchMatches.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        color: 'var(--ios-text-primary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Previous Match"
                    >
                      <MaterialIcon name="keyboard_arrow_up" size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        color: 'var(--ios-text-primary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Next Match"
                    >
                      <MaterialIcon name="keyboard_arrow_down" size={20} />
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ios-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '3px'
              }}
            >
              <MaterialIcon name="close" size={17} />
            </button>
          </div>
        ) : (
          /* Normal In-line Row: [Search Icon] [+ Poll] | [All] [Bills & Rent] [Chores] [Urgent] */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '2px'
            }}
            className="no-scrollbar"
          >
            {/* Search Trigger */}
            <button
              onClick={() => setShowSearch(true)}
              className="nav-icon-btn"
              style={{
                width: '32px',
                height: '32px',
                flexShrink: 0,
                borderRadius: '16px'
              }}
              title="Search Chat"
            >
              <MaterialIcon name="search" size={16} />
            </button>

            {/* Create Poll Button */}
            <button
              onClick={() => {
                playHapticChime('click');
                setShowPollModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '16px',
                background: 'var(--ios-blue-light, #EFF6FF)',
                border: '1px solid var(--ios-blue)',
                color: 'var(--ios-blue)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <MaterialIcon name="poll" size={14} color="var(--ios-blue)" /> Poll
            </button>

            <div style={{ width: '1px', height: '18px', background: 'var(--ios-card-border)', margin: '0 2px', flexShrink: 0 }} />

            {/* Category Filter Chips */}
            <button
              onClick={() => setFilterCategory('all')}
              className={`flat-filter-pill ${filterCategory === 'all' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '11.5px', flexShrink: 0 }}
            >
              All ({messages.length})
            </button>
            <button
              onClick={() => setFilterCategory('bills')}
              className={`flat-filter-pill ${filterCategory === 'bills' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '11.5px', flexShrink: 0 }}
            >
              Bills & Rent
            </button>
            <button
              onClick={() => setFilterCategory('chores')}
              className={`flat-filter-pill ${filterCategory === 'chores' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '11.5px', flexShrink: 0 }}
            >
              Chores
            </button>
            <button
              onClick={() => setFilterCategory('urgent')}
              className={`flat-filter-pill ${filterCategory === 'urgent' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '11.5px', flexShrink: 0 }}
            >
              Urgent
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp Immersive Message Feed Canvas */}
      <div
        className="whatsapp-chat-canvas apple-sleek-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '12px 10px 14px 10px'
        }}
      >
        {categoryMessages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--ios-text-tertiary)' }}>
            <MaterialIcon name="chat" size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div style={{ fontSize: '13px' }}>No messages in this filter.</div>
          </div>
        ) : (
          categoryMessages.map((msg, idx) => {
            const sender = members.find((m) => m.id === msg.senderId);
            const isMe = msg.senderId === currentUser?.id;

            // Date divider check
            const currentDateLabel = getDateLabel(msg.timestamp);
            const prevMessage = idx > 0 ? categoryMessages[idx - 1] : null;
            const prevDateLabel = prevMessage ? getDateLabel(prevMessage.timestamp) : null;
            const showDateDivider = currentDateLabel !== prevDateLabel;

            // Check if this message is the currently active search match
            const isCurrentActiveMatch =
              searchMatches.length > 0 && searchMatches[activeMatchIndex]?.id === msg.id;

            return (
              <React.Fragment key={msg.id}>
                {/* WhatsApp-Style Date Badge */}
                {showDateDivider && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
                    <span
                      style={{
                        background: 'var(--ios-card, rgba(255, 255, 255, 0.85))',
                        border: '1px solid var(--ios-card-border, #E2E8F0)',
                        color: 'var(--ios-text-secondary)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '10px',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      {currentDateLabel}
                    </span>
                  </div>
                )}

                {/* WhatsApp Message Bubble */}
                <div
                  id={`whatsapp-msg-${msg.id}`}
                  className={`whatsapp-bubble ${isMe ? 'whatsapp-bubble-me' : 'whatsapp-bubble-other'} ${
                    isCurrentActiveMatch ? 'whatsapp-bubble-highlighted' : ''
                  }`}
                >
                  {/* Sender Name on Received Messages */}
                  {!isMe && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginBottom: '3px'
                      }}
                    >
                      <FlatmateAvatar
                        id={msg.senderId === 'system' ? 'owner' : sender?.id}
                        customAvatar={sender?.customAvatar}
                        size={16}
                      />
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          color: sender?.avatarColor || 'var(--ios-blue)',
                          lineHeight: 1.1
                        }}
                      >
                        {renderHighlightedText(msg.senderName, isCurrentActiveMatch)}
                      </span>
                    </div>
                  )}

                  {/* INTERACTIVE POLL RENDERING */}
                  {msg.poll ? (
                    <div style={{ margin: '4px 0' }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: 'var(--ios-text-primary)',
                          marginBottom: '8px'
                        }}
                      >
                        📊 {renderHighlightedText(msg.poll.question, isCurrentActiveMatch)}
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {(() => {
                          const totalVotes = msg.poll.options.reduce(
                            (acc, opt) => acc + (opt.votes?.length || 0),
                            0
                          );

                          return msg.poll.options.map((opt) => {
                            const optVotes = opt.votes?.length || 0;
                            const percentage =
                              totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
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
                                  padding: '7px 10px',
                                  borderRadius: '10px',
                                  border: hasVoted
                                    ? '1.5px solid var(--ios-blue)'
                                    : '1px solid var(--ios-card-border)',
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
                                    background: hasVoted
                                      ? 'rgba(0, 122, 255, 0.2)'
                                      : 'rgba(0, 0, 0, 0.06)',
                                    transition: 'width 0.25s ease'
                                  }}
                                />

                                <span
                                  style={{
                                    position: 'relative',
                                    fontSize: '12.5px',
                                    fontWeight: hasVoted ? 800 : 600,
                                    color: 'var(--ios-text-primary)',
                                    zIndex: 1
                                  }}
                                >
                                  {hasVoted && (
                                    <MaterialIcon
                                      name="check_circle"
                                      size={14}
                                      color="var(--ios-blue)"
                                      filled
                                      style={{ display: 'inline', marginRight: '4px' }}
                                    />
                                  )}
                                  {renderHighlightedText(opt.text, isCurrentActiveMatch)}
                                </span>

                                <span
                                  style={{
                                    position: 'relative',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'var(--ios-text-secondary)',
                                    zIndex: 1
                                  }}
                                >
                                  {percentage}% ({optVotes})
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* Standard text message with highlight support */
                    <div
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--ios-text-primary)',
                        lineHeight: 1.4,
                        whiteSpace: 'pre-wrap',
                        paddingRight: '4px'
                      }}
                    >
                      {renderHighlightedText(msg.text, isCurrentActiveMatch)}
                    </div>
                  )}

                  {/* Bubble Footer: Timestamp & Blue Double Checkmarks */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '3px',
                      marginTop: '2px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--ios-text-tertiary)',
                        fontWeight: 600
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {isMe && (
                      <MaterialIcon
                        name="done_all"
                        size={14}
                        color="var(--whatsapp-check-blue, #34B7F1)"
                      />
                    )}
                  </div>

                  {/* Tapback Reactions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      paddingTop: '4px',
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
                            background: isSelectedByMe
                              ? react.bg
                              : count > 0
                              ? 'var(--ios-card-inset)'
                              : 'transparent',
                            border: isSelectedByMe
                              ? `1.5px solid ${react.color}`
                              : count > 0
                              ? '1px solid var(--ios-card-border)'
                              : '1px solid var(--ios-card-border-soft)',
                            borderRadius: '10px',
                            padding: '2px 5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transform: isSelectedByMe ? 'scale(1.05)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <ReactionIcon type={react.id} size={12} />
                          {count > 0 && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: isSelectedByMe ? react.color : 'var(--ios-text-secondary)'
                              }}
                            >
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

      {/* Quick Suggestion Chips (NO SCROLLBAR) */}
      <div style={{ flexShrink: 0, marginTop: '6px' }}>
        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}
        >
          {quickChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="flat-quick-chip"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              {chip.text}
            </button>
          ))}
        </div>
      </div>

      {/* Clean WhatsApp Style Composer Input (NO General Button, NO "Sending as Manas") */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '6px 2px 4px 2px',
          flexShrink: 0
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <input
            className="ios-input"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14.5px',
              borderRadius: '24px',
              background: 'var(--ios-card)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => onTypingChange?.(true)}
            onBlur={() => onTypingChange?.(false)}
            id="flat-chat-input"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim()}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: inputText.trim() ? '#25D366' : 'var(--ios-card-inset)',
            color: inputText.trim() ? '#FFFFFF' : 'var(--ios-text-tertiary)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: inputText.trim() ? 'pointer' : 'default',
            boxShadow: inputText.trim() ? '0 3px 10px rgba(37, 211, 102, 0.35)' : 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          id="send-chat-msg-btn"
        >
          <MaterialIcon name="send" size={18} color="currentColor" />
        </button>
      </form>

      {/* CREATE POLL MODAL */}
      {showPollModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowPollModal(false)}
          style={{ zIndex: 110 }}
        >
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
