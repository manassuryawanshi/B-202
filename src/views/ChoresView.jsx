import React, { useState } from 'react';
import FlatmateAvatar from '../components/Avatars';
import confetti from 'canvas-confetti';
import { playHapticChime } from '../data/storage';
import { StandardCleaningIcon } from '../components/AppIcons';
import MaterialIcon from '../components/MaterialIcon';

export default function ChoresView({
  currentUser,
  members,
  areas,
  choreHistory,
  onMarkChoreCleaned,
  onSwapTurn
}) {
  const [activeSegment, setActiveSegment] = useState('duties');
  const [filterType, setFilterType] = useState('all');

  const [markingArea, setMarkingArea] = useState(null);
  const [cleanNotes, setCleanNotes] = useState('');
  const [swappingArea, setSwappingArea] = useState(null);
  const [swapWithMemberId, setSwapWithMemberId] = useState('');

  // Leaderboard Calculation
  const statsByMember = members.map((member) => {
    const memberLogs = choreHistory.filter((item) => item.cleanedBy === member.id);
    const bathroomLogs = memberLogs.filter((item) => item.areaId.includes('bath'));
    const balconyLogs = memberLogs.filter((item) => item.areaId.includes('balcony'));

    return {
      member,
      totalCleaned: memberLogs.length,
      bathroomCount: bathroomLogs.length,
      balconyCount: balconyLogs.length
    };
  }).sort((a, b) => b.totalCleaned - a.totalCleaned);

  const handleOpenMarkCleaned = (area) => {
    playHapticChime('click');
    setMarkingArea(area);
    setCleanNotes('');
  };

  const handleConfirmCleaned = () => {
    if (!markingArea) return;
    playHapticChime('success');
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.7 }
    });
    onMarkChoreCleaned(markingArea.id, markingArea.currentTurn, cleanNotes);
    setMarkingArea(null);
  };

  const handleOpenSwap = (area) => {
    playHapticChime('click');
    setSwappingArea(area);
    const eligible = area.rotationOrder.filter((id) => id !== area.currentTurn);
    setSwapWithMemberId(eligible[0] || area.rotationOrder[0]);
  };

  const handleConfirmSwap = () => {
    if (!swappingArea || !swapWithMemberId) return;
    playHapticChime('click');
    onSwapTurn(swappingArea.id, swapWithMemberId);
    setSwappingArea(null);
  };

  const filteredAreas = areas.filter((a) => {
    if (filterType === 'bathroom') return a.type === 'Bathroom';
    if (filterType === 'balcony') return a.type === 'Balcony';
    return true;
  });

  return (
    <div className="view-content">
      {/* Segmented Control */}
      <div className="segmented-control">
        <button
          className={`segmented-btn ${activeSegment === 'duties' ? 'active' : ''}`}
          onClick={() => {
            playHapticChime('click');
            setActiveSegment('duties');
          }}
          id="segment-duties-btn"
        >
          <StandardCleaningIcon size={15} /> Active Duties
        </button>
        <button
          className={`segmented-btn ${activeSegment === 'leaderboard' ? 'active' : ''}`}
          onClick={() => {
            playHapticChime('click');
            setActiveSegment('leaderboard');
          }}
          id="segment-leaderboard-btn"
        >
          <MaterialIcon name="emoji_events" size={15} /> Leaderboard
        </button>
        <button
          className={`segmented-btn ${activeSegment === 'history' ? 'active' : ''}`}
          onClick={() => {
            playHapticChime('click');
            setActiveSegment('history');
          }}
          id="segment-history-btn"
        >
          <MaterialIcon name="history" size={15} /> History Log
        </button>
      </div>

      {/* SECTION 1: DUTIES */}
      {activeSegment === 'duties' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Filter Pills (Clean Flat) */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => {
                playHapticChime('click');
                setFilterType('all');
              }}
              className={`flat-filter-pill ${filterType === 'all' ? 'active' : ''}`}
            >
              All (5 Areas)
            </button>
            <button
              className={`flat-filter-pill ${filterType === 'bathroom' ? 'active' : ''}`}
              onClick={() => {
                playHapticChime('click');
                setFilterType('bathroom');
              }}
            >
              <MaterialIcon name="bathtub" size={14} /> Bathrooms (2)
            </button>
            <button
              className={`flat-filter-pill ${filterType === 'balcony' ? 'active' : ''}`}
              onClick={() => {
                playHapticChime('click');
                setFilterType('balcony');
              }}
            >
              <MaterialIcon name="balcony" size={14} /> Balconies (3)
            </button>
          </div>

          {filteredAreas.map((area) => {
            const currentCleaner = members.find((m) => m.id === area.currentTurn);
            const nextCleaner = members.find((m) => m.id === area.nextTurn);
            const isMyTurn = area.currentTurn === currentUser?.id;

            return (
              <div key={area.id} className="ios-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: area.type === 'Bathroom' ? 'var(--ios-blue-light)' : 'var(--ios-green-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: area.type === 'Bathroom' ? 'var(--ios-blue)' : 'var(--ios-green)'
                      }}
                    >
                      {area.type === 'Bathroom' ? <MaterialIcon name="bathtub" size={22} /> : <MaterialIcon name="balcony" size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                          {area.name}
                        </h3>
                        <span className={`status-pill ${area.type === 'Bathroom' ? 'info' : 'success'}`}>
                          {area.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                        Assigned to: <strong>{area.usedBy}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Turn Info */}
                <div className="ios-inset-box" style={{ margin: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                        Current Turn
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <FlatmateAvatar id={currentCleaner?.id} size={26} />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: isMyTurn ? 'var(--ios-blue)' : 'var(--ios-text-primary)' }}>
                          {isMyTurn ? 'YOU (Your Turn Today!)' : currentCleaner?.name}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', fontWeight: 700 }}>
                        Up Next
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                        {nextCleaner?.name || 'Rotation'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions - strictly only assigned flatmate can complete or swap */}
                {isMyTurn ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="ios-btn ios-btn-success"
                      style={{ flex: 2 }}
                      onClick={() => handleOpenMarkCleaned(area)}
                      id={`mark-cleaned-${area.id}`}
                    >
                      <MaterialIcon name="check_circle" size={16} filled /> Mark as Cleaned
                    </button>

                    <button
                      className="ios-btn ios-btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => handleOpenSwap(area)}
                      title="Swap turn"
                      id={`swap-turn-${area.id}`}
                    >
                      <MaterialIcon name="swap_horiz" size={16} /> Swap
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="ios-btn ios-btn-secondary"
                      style={{
                        flex: 1,
                        opacity: 0.65,
                        cursor: 'not-allowed',
                        justifyContent: 'center',
                        fontSize: '12.5px',
                        fontWeight: 600
                      }}
                      disabled
                      title="Only the assigned flatmate can complete or swap this chore"
                    >
                      <MaterialIcon name="lock" size={14} color="var(--ios-text-secondary)" /> Only {currentCleaner?.name} can complete or swap
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 2: LEADERBOARD (No cheap emojis, clean #1 #2 #3 badges) */}
      {activeSegment === 'leaderboard' && (
        <div className="ios-card">
          <h2 className="card-title">
            <MaterialIcon name="emoji_events" size={20} color="var(--ios-orange)" /> Cleaning Leaderboard
          </h2>
          <div className="card-subtitle">
            Who cleaned what and total times verified
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            {statsByMember.map((stat, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              const isMe = stat.member.id === currentUser?.id;

              return (
                <div key={stat.member.id} className="ios-inset-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: isFirst ? '#FEF3C7' : isSecond ? '#E2E8F0' : isThird ? '#FFEDD5' : '#F3F4F6',
                          color: isFirst ? '#B45309' : isSecond ? '#475569' : isThird ? '#C2410C' : '#6B7280',
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        #{index + 1}
                      </div>

                      <FlatmateAvatar id={stat.member.id} size={36} />

                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                          {stat.member.name} {isMe && '(You)'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                          {stat.member.roomBadge}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ios-blue)' }}>
                        {stat.totalCleaned}
                      </span>{' '}
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>cleans</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #E5E7EB',
                      fontSize: '11.5px',
                      color: 'var(--ios-text-secondary)'
                    }}
                  >
                    <span>Bathrooms: <strong style={{ color: 'var(--ios-text-primary)' }}>{stat.bathroomCount}</strong></span>
                    <span>•</span>
                    <span>Balconies: <strong style={{ color: 'var(--ios-text-primary)' }}>{stat.balconyCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: HISTORY LOG */}
      {activeSegment === 'history' && (
        <div className="ios-card">
          <h2 className="card-title">
            <MaterialIcon name="history" size={20} color="var(--ios-blue)" /> Cleaning History Log
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {choreHistory.map((item) => (
              <div key={item.id} className="ios-inset-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    {item.areaName}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--ios-text-tertiary)' }}>
                    {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--ios-green)', fontWeight: 700, marginTop: '2px' }}>
                  Cleaned by {item.cleanedByName}
                </div>
                {item.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                    "{item.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MARK CLEANED MODAL */}
      {markingArea && (
        <div className="modal-backdrop" onClick={() => setMarkingArea(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab-bar" />
            <div className="sheet-header">
              <h2 className="sheet-title">Confirm {markingArea.name} Cleaned</h2>
              <button className="sheet-close-btn" onClick={() => setMarkingArea(null)}>
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <div className="ios-input-group">
              <label className="ios-label">Cleaning Notes (Optional)</label>
              <input
                className="ios-input"
                placeholder="e.g. wiped floor, scrubbed washbasin"
                value={cleanNotes}
                onChange={(e) => setCleanNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="ios-btn ios-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setMarkingArea(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ios-btn ios-btn-success"
                style={{ flex: 2 }}
                onClick={handleConfirmCleaned}
              >
                <MaterialIcon name="check_circle" size={16} filled /> Confirm Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SWAP TURN MODAL */}
      {swappingArea && (
        <div className="modal-backdrop" onClick={() => setSwappingArea(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab-bar" />
            <div className="sheet-header">
              <h2 className="sheet-title">Swap Turn ({swappingArea.name})</h2>
              <button className="sheet-close-btn" onClick={() => setSwappingArea(null)}>
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <div className="ios-input-group">
              <label className="ios-label">Eligible Flatmates for this Area</label>
              <select
                className="ios-select"
                value={swapWithMemberId}
                onChange={(e) => setSwapWithMemberId(e.target.value)}
              >
                {swappingArea.rotationOrder
                  .filter((id) => id !== swappingArea.currentTurn)
                  .map((id) => {
                    const m = members.find((mem) => mem.id === id);
                    return (
                      <option key={id} value={id}>
                        {m?.name || id} ({m?.roomBadge})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="ios-btn ios-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSwappingArea(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ios-btn ios-btn-primary"
                style={{ flex: 2 }}
                onClick={handleConfirmSwap}
              >
                <MaterialIcon name="swap_horiz" size={16} /> Confirm Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
