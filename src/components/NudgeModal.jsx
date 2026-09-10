import React, { useState } from 'react';
import FlatmateAvatar from './Avatars';
import { playHapticChime, sendBrowserNotification } from '../data/storage';
import MaterialIcon from './MaterialIcon';

export default function NudgeModal({
  isOpen,
  onClose,
  members,
  currentUser,
  onSendNudge
}) {
  if (!isOpen || !currentUser) return null;

  // Other flatmates (excluding current user)
  const otherMembers = members.filter((m) => m.id !== currentUser.id);

  // Multi-recipient selection (array of member IDs)
  const [selectedRecipientIds, setSelectedRecipientIds] = useState(
    otherMembers.map((m) => m.id)
  );

  const [selectedTemplate, setSelectedTemplate] = useState('elec');
  const [customText, setCustomText] = useState(
    'Reminder: Electricity bill is due. Please check your custom share in the Bills tab and pay.'
  );
  const [isSentSuccess, setIsSentSuccess] = useState(false);

  const templates = [
    {
      id: 'elec',
      label: 'Electricity Bill',
      iconName: 'bolt',
      defaultText: 'Electricity bill is due by 15th Sep. Please check your share in the Bills tab and pay on time.'
    },
    {
      id: 'rent',
      label: 'Flat Rent',
      iconName: 'home',
      defaultText: 'Rent Reminder: Monthly rent of ₹27,000 is due on 5th Sep. Please transfer your share to Ujwal and mark done in the app.'
    },
    {
      id: 'bath',
      label: 'Clean Bathroom',
      iconName: 'bathtub',
      defaultText: 'Bathroom Duty: Please check whose turn it is in the Chores tab and clean today.'
    },
    {
      id: 'balcony',
      label: 'Clean Balconies',
      iconName: 'balcony',
      defaultText: 'Balcony Duty: Please sweep and mop the balcony today.'
    },
    {
      id: 'wm',
      label: 'Washing Machine',
      iconName: 'local_laundry_service',
      defaultText: 'Washing Machine Bill: ₹100 per person is due. Please settle up.'
    }
  ];

  // Toggle recipient selection
  const handleToggleRecipient = (memberId) => {
    playHapticChime('pop');
    if (selectedRecipientIds.includes(memberId)) {
      // Don't allow deselecting all (keep at least 1)
      if (selectedRecipientIds.length > 1) {
        setSelectedRecipientIds(selectedRecipientIds.filter((id) => id !== memberId));
      }
    } else {
      setSelectedRecipientIds([...selectedRecipientIds, memberId]);
    }
  };

  const handleSelectAll = () => {
    playHapticChime('pop');
    if (selectedRecipientIds.length === otherMembers.length) {
      // If all selected, select first only
      setSelectedRecipientIds([otherMembers[0].id]);
    } else {
      setSelectedRecipientIds(otherMembers.map((m) => m.id));
    }
  };

  const handleSelectTemplate = (tmpl) => {
    playHapticChime('click');
    setSelectedTemplate(tmpl.id);
    setCustomText(tmpl.defaultText);
  };

  const selectedMembers = otherMembers.filter((m) =>
    selectedRecipientIds.includes(m.id)
  );
  const isAllSelected = selectedRecipientIds.length === otherMembers.length;

  const getRecipientSummary = () => {
    if (isAllSelected) return 'All Flatmates';
    return selectedMembers.map((m) => m.name).join(', ');
  };

  const handleSend = (destination = 'in-app') => {
    playHapticChime('nudge');

    const recipientLabel = getRecipientSummary();

    onSendNudge({
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientIds: selectedRecipientIds,
      recipientName: recipientLabel,
      isAll: isAllSelected,
      text: customText,
      category: selectedTemplate === 'bath' || selectedTemplate === 'balcony' ? 'chores' : 'bills'
    });

    if (destination === 'whatsapp') {
      const encodedMsg = encodeURIComponent(
        `*B-202 Skyra Announcement*\nFrom: ${currentUser.name}\nTo: ${recipientLabel}\n\n${customText}\n\nCheck B-202 Flat App: ${window.location.origin}`
      );

      if (selectedRecipientIds.length === 1) {
        const targetMember = otherMembers.find((m) => m.id === selectedRecipientIds[0]);
        if (targetMember?.phone) {
          window.open(`https://wa.me/91${targetMember.phone}?text=${encodedMsg}`, '_blank');
        }
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
      }
    }

    setIsSentSuccess(true);
    setTimeout(() => {
      setIsSentSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
        <div className="sheet-grab-bar" />

        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MaterialIcon name="campaign" size={22} color="var(--ios-orange)" />
            <h2 className="sheet-title">Send Broadcast Nudge</h2>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        {/* MULTI-RECIPIENT SELECTOR */}
        <div className="ios-input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="ios-label" style={{ margin: 0 }}>
              Select Flatmates ({selectedRecipientIds.length} of {otherMembers.length})
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ios-blue)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {otherMembers.map((member) => {
              const isSelected = selectedRecipientIds.includes(member.id);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleToggleRecipient(member.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '14px',
                    border: isSelected
                      ? '1.5px solid var(--ios-blue)'
                      : '1px solid var(--ios-card-border)',
                    background: isSelected
                      ? 'var(--ios-active-pill-bg, #EFF6FF)'
                      : 'var(--ios-card-inset)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FlatmateAvatar id={member.id} customAvatar={member.customAvatar} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 600, color: 'var(--ios-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--ios-text-secondary)' }}>
                      {member.roomBadge}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'var(--ios-blue)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <MaterialIcon name="check" size={13} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '6px' }}>
            Broadcasting to: <strong style={{ color: 'var(--ios-blue)' }}>{getRecipientSummary()}</strong>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="ios-input-group">
          <label className="ios-label">Quick Message Topic</label>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {templates.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`flat-filter-pill ${isSelected ? 'active' : ''}`}
                  style={{ flexShrink: 0 }}
                >
                  <MaterialIcon name={tmpl.iconName} size={15} />
                  <span>{tmpl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Text Area */}
        <div className="ios-input-group">
          <label className="ios-label">Announcement Message</label>
          <textarea
            className="ios-textarea"
            rows={3}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type reminder message..."
            required
            style={{ resize: 'none' }}
          />
        </div>

        {isSentSuccess && (
          <div
            style={{
              background: 'var(--ios-green-light)',
              border: '1px solid var(--ios-green)',
              color: 'var(--ios-green)',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px'
            }}
          >
            <MaterialIcon name="check_circle" size={16} filled /> Broadcast sent to {getRecipientSummary()}!
          </div>
        )}

        {/* Action Triggers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            className="ios-btn ios-btn-primary"
            onClick={() => handleSend('in-app')}
            id="send-in-app-nudge-btn"
          >
            <MaterialIcon name="send" size={15} /> Send in App & Chat
          </button>

          <button
            type="button"
            className="ios-btn ios-btn-secondary"
            onClick={() => handleSend('whatsapp')}
            style={{ color: '#25D366' }}
            id="send-whatsapp-nudge-btn"
          >
            <MaterialIcon name="chat" size={16} color="#25D366" /> Share on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
