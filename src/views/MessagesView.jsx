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
  onBack
}) {
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Reply-to State
  const [replyTo, setReplyTo] = useState(null); // { id, senderName, text }
  const inputRef = useRef(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);

  // Poll Creation Modal State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Yes', 'No']);

  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);

  // Oldest at top, newest at bottom
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messages]);

  // Search matches array
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return sortedMessages.filter((m) => {
      const matchText = (m.text || '').toLowerCase().includes(q);
      const matchSender = (m.senderName || '').toLowerCase().includes(q);
      const matchPollQ = m.poll?.question?.toLowerCase().includes(q);
      const matchPollOpts = m.poll?.options?.some((o) => o.text.toLowerCase().includes(q));
      return matchText || matchSender || matchPollQ || matchPollOpts;
    });
  }, [sortedMessages, searchQuery]);

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
  }, [messages.length, showSearch]);

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`chat-msg-${msgId}`);
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
      category: 'general',
      replyTo: replyTo || null
    });
    setInputText('');
    setReplyTo(null);
  };

  const triggerReply = (msg) => {
    playHapticChime('click');
    const preview = msg.poll
      ? `📊 ${msg.poll.question}`
      : (msg.text || '').slice(0, 80);
    setReplyTo({ id: msg.id, senderName: msg.senderName, text: preview });
    setTimeout(() => inputRef.current?.focus(), 50);
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

  const memberNamesList = members.map((m) => m.name).join(', ');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'var(--ios-bg)',
        position: 'relative'
      }}
    >
      {/* IMMERSIVE CHAT HEADER with Back Button at Top Left */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--ios-nav-bg, rgba(255, 255, 255, 0.94))',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderBottom: '0.5px solid var(--ios-card-border)',
          paddingTop: 'max(calc(env(safe-area-inset-top, 44px) + 6px), 18px)',
          paddingBottom: '10px',
          paddingLeft: '12px',
          paddingRight: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0
        }}
      >
        {showSearch ? (
          /* Search Bar Mode with Match Navigation */
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--ios-card-inset, #F3F4F6)',
              border: '1px solid var(--ios-card-border)',
              borderRadius: '20px',
              padding: '4px 8px 4px 10px',
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
                fontSize: '14px',
                color: 'var(--ios-text-primary)',
                padding: '3px 0'
              }}
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />

            {searchQuery.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '11.5px',
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
                        padding: '2px',
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
                        padding: '2px',
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
                padding: '2px'
              }}
            >
              <MaterialIcon name="close" size={18} />
            </button>
          </div>
        ) : (
          /* Normal WhatsApp/iOS Chat Header */
          <>
            {/* Left: Back Button + Group Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              {/* Back button just like in WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  playHapticChime('click');
                  onBack?.();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  color: 'var(--ios-blue)',
                  padding: '4px 2px',
                  marginRight: '2px',
                  WebkitTapHighlightColor: 'transparent'
                }}
                title="Go Back"
              >
                <MaterialIcon name="arrow_back_ios_new" size={20} color="var(--ios-blue)" />
              </button>

              {/* Group Avatar */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #007AFF 0%, #4338CA 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  boxShadow: '0 2px 6px rgba(0, 122, 255, 0.25)',
                  flexShrink: 0
                }}
              >
                B202
              </div>

              {/* Title & Members Subtitle */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--ios-text-primary)',
                    letterSpacing: '-0.3px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Flat B-202
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--ios-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}
                >
                  {memberNamesList}
                </div>
              </div>
            </div>

            {/* Right: Search & Create Poll */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="nav-icon-btn"
                style={{ width: '34px', height: '34px' }}
                title="Search Messages"
              >
                <MaterialIcon name="search" size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  playHapticChime('click');
                  setShowPollModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '18px',
                  background: 'var(--ios-blue-light, #EFF6FF)',
                  border: '1px solid var(--ios-blue)',
                  color: 'var(--ios-blue)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Create Poll"
              >
                <MaterialIcon name="poll" size={15} color="var(--ios-blue)" /> Poll
              </button>
            </div>
          </>
        )}
      </header>

      {/* Message Feed (Original Clean Apple Colors & Styling) */}
      <div
        className="apple-sleek-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: 'var(--ios-bg)'
        }}
      >
        {sortedMessages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--ios-text-tertiary)' }}>
            <MaterialIcon name="chat" size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div style={{ fontSize: '14px' }}>No messages yet. Say hi!</div>
          </div>
        ) : (
          sortedMessages.map((msg, idx) => {
            const sender = members.find((m) => m.id === msg.senderId);
            const isMe = msg.senderId === currentUser?.id;

            // Date divider check
            const currentDateLabel = getDateLabel(msg.timestamp);
            const prevMessage = idx > 0 ? sortedMessages[idx - 1] : null;
            const prevDateLabel = prevMessage ? getDateLabel(prevMessage.timestamp) : null;
            const showDateDivider = currentDateLabel !== prevDateLabel;

            // Search highlight check
            const isCurrentActiveMatch =
              searchMatches.length > 0 && searchMatches[activeMatchIndex]?.id === msg.id;

            const isBroadcast = msg.isBroadcast || (typeof msg.text === 'string' && msg.text.startsWith('📢')) || msg.category === 'broadcast';

            return (
              <React.Fragment key={msg.id}>
                {/* Clean Apple Date Divider */}
                {showDateDivider && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <span
                      style={{
                        background: 'var(--ios-card-inset, #F3F4F6)',
                        border: '1px solid var(--ios-card-border, #E5E7EB)',
                        color: 'var(--ios-text-secondary)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 12px',
                        borderRadius: '12px',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      {currentDateLabel}
                    </span>
                  </div>
                )}

                {/* Message row: reply arrow + bubble, aligned by sender */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: isMe ? 'flex-end' : 'flex-start'
                  }}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {/* Reply arrow — left side for others' messages */}
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => triggerReply(msg)}
                      title="Reply"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'var(--ios-blue)',
                        opacity: hoveredMsgId === msg.id ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <MaterialIcon name="reply" size={18} color="var(--ios-text-tertiary)" />
                    </button>
                  )}

                {/* Message Bubble */}
                <div
                  id={`chat-msg-${msg.id}`}
                  style={{
                    maxWidth: '85%',
                    background: isBroadcast
                      ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(254, 215, 170, 0.85))'
                      : isMe
                      ? 'var(--ios-blue-light, #EFF6FF)'
                      : 'var(--ios-card, #FFFFFF)',
                    border: isBroadcast
                      ? '1.5px solid #F59E0B'
                      : isMe
                      ? '1px solid #BFDBFE'
                      : '1px solid var(--ios-card-border)',
                    borderRadius: '18px',
                    borderBottomRightRadius: isMe ? '4px' : '18px',
                    borderBottomLeftRadius: isMe ? '18px' : '4px',
                    padding: '10px 14px 8px 14px',
                    boxShadow: isCurrentActiveMatch
                      ? '0 0 0 3px #F59E0B, 0 6px 18px rgba(245, 158, 11, 0.35)'
                      : replyTo?.id === msg.id
                      ? '0 0 0 2px var(--ios-blue)'
                      : isBroadcast
                      ? '0 4px 14px rgba(245, 158, 11, 0.2)'
                      : '0 1px 4px rgba(0, 0, 0, 0.04)',
                    position: 'relative',
                    transition: 'box-shadow 0.25s ease'
                  }}
                >
                  {/* Flat Announcement Badge */}
                  {isBroadcast && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#EA580C',
                        color: '#FFFFFF',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        marginBottom: '6px',
                        boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)'
                      }}
                    >
                      <span>📢 Flat Announcement</span>
                    </div>
                  )}

                  {/* Sender Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FlatmateAvatar
                        id={msg.senderId === 'system' ? 'owner' : sender?.id}
                        customAvatar={sender?.customAvatar}
                        size={18}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: isMe ? 'var(--ios-blue)' : (sender?.avatarColor || 'var(--ios-text-primary)')
                        }}
                      >
                        {renderHighlightedText(msg.senderName, isCurrentActiveMatch)} {isMe && '(You)'}
                      </span>
                    </div>

                    <span style={{ fontSize: '10px', color: 'var(--ios-text-tertiary)', fontWeight: 600 }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Quoted Reply Context — neutral grey, clearly distinct from bubble */}
                  {msg.replyTo && (
                    <div
                      onClick={() => scrollToMessage(msg.replyTo.id)}
                      style={{
                        background: 'rgba(120, 120, 128, 0.12)',
                        borderLeft: '3px solid var(--ios-blue)',
                        borderRadius: '10px',
                        padding: '6px 10px',
                        marginBottom: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ios-blue)', marginBottom: '2px' }}>
                        ↩ {msg.replyTo.senderName}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--ios-text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px'
                        }}
                      >
                        {msg.replyTo.text}
                      </div>
                    </div>
                  )}

                  {/* INTERACTIVE POLL RENDERING */}
                  {msg.poll ? (
                    <div style={{ margin: '6px 0' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: 'var(--ios-text-primary)',
                          marginBottom: '8px'
                        }}
                      >
                        📊 {renderHighlightedText(msg.poll.question, isCurrentActiveMatch)}
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                                  padding: '8px 12px',
                                  borderRadius: '12px',
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
                                      : 'rgba(0, 0, 0, 0.05)',
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
                                      style={{ display: 'inline', marginRight: '5px' }}
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
                    /* Standard text message */
                    <div
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--ios-text-primary)',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {renderHighlightedText(msg.text, isCurrentActiveMatch)}
                    </div>
                  )}

                  {/* Tapback Reactions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '6px',
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
                          <ReactionIcon type={react.id} size={12} />
                          {count > 0 && (
                            <span
                              style={{
                                fontSize: '10.5px',
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

                  {/* Reply arrow — right side for own messages */}
                  {isMe && (
                    <button
                      type="button"
                      onClick={() => triggerReply(msg)}
                      title="Reply"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'var(--ios-text-tertiary)',
                        opacity: hoveredMsgId === msg.id ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <MaterialIcon name="reply" size={18} color="var(--ios-text-tertiary)" />
                    </button>
                  )}
                </div> {/* close message row */}
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Clean Composer (NO Suggestions, NO Category Tags, NO "Sending as Manas") */}
      <div
        style={{
          background: 'var(--ios-nav-bg, rgba(255, 255, 255, 0.94))',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderTop: '0.5px solid var(--ios-card-border)',
          flexShrink: 0
        }}
      >
        {/* Reply Preview Strip */}
        {replyTo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px 6px 14px',
              borderBottom: '0.5px solid var(--ios-card-border)',
              animation: 'modalFadeIn 0.15s ease-out'
            }}
          >
            <div style={{ width: '3px', alignSelf: 'stretch', background: 'var(--ios-blue)', borderRadius: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--ios-blue)' }}>
                {replyTo.senderName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--ios-text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {replyTo.text}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ios-text-tertiary)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <MaterialIcon name="close" size={18} />
            </button>
          </div>
        )}

      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '10px 14px calc(env(safe-area-inset-bottom, 8px) + 8px) 14px'
        }}
      >
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            className="ios-input"
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '14.5px',
              borderRadius: '24px',
              background: 'var(--ios-card-inset, #F3F4F6)'
            }}
            placeholder={replyTo ? `Reply to ${replyTo.senderName}...` : 'Type a message...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
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
            background: inputText.trim() ? 'var(--ios-blue, #007AFF)' : 'var(--ios-card-inset, #E5E7EB)',
            color: inputText.trim() ? '#FFFFFF' : 'var(--ios-text-tertiary)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: inputText.trim() ? 'pointer' : 'default',
            boxShadow: inputText.trim() ? '0 3px 10px rgba(0, 122, 255, 0.35)' : 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          id="send-chat-msg-btn"
        >
          <MaterialIcon name="send" size={18} color="currentColor" />
        </button>
      </form>
      </div>

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
