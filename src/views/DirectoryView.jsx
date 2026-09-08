import React, { useState } from 'react';
import FlatmateAvatar from '../components/Avatars';
import { playHapticChime } from '../data/storage';
import MaterialIcon from '../components/MaterialIcon';

export default function DirectoryView({
  members,
  owner,
  onOpenQrModal,
  onUpdateMemberUpi
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [editUpiInput, setEditUpiInput] = useState('');

  const copyToClipboard = (key, text) => {
    playHapticChime('click');
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStartEditUpi = (member) => {
    setEditingMember(member);
    setEditUpiInput(member.upiId);
  };

  const handleSaveUpi = () => {
    if (editingMember && editUpiInput) {
      playHapticChime('success');
      onUpdateMemberUpi(editingMember.id, editUpiInput);
      setEditingMember(null);
    }
  };

  return (
    <div className="view-content">
      {/* OWNER / LANDLORD CONTACT CARD */}
      <div
        className="ios-card"
        style={{
          border: '1.5px solid var(--ios-card-border)',
          background: 'var(--ios-card)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <FlatmateAvatar id="owner" size={44} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  {owner.name}
                </h3>
                <span className="status-pill neutral">Flat Owner</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                {owner.displayPhone} • Agreement & Flat Queries
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px' }}>
          <a
            href={`tel:${owner.phone}`}
            className="ios-btn ios-btn-secondary ios-btn-sm"
            style={{ textDecoration: 'none', justifyContent: 'center' }}
          >
            <MaterialIcon name="call" size={14} color="var(--ios-green)" /> Call Owner
          </a>

          <a
            href={owner.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="ios-btn ios-btn-secondary ios-btn-sm"
            style={{ textDecoration: 'none', justifyContent: 'center' }}
          >
            <MaterialIcon name="chat" size={14} color="#25D366" /> WhatsApp
          </a>
        </div>
      </div>

      {/* 5 FLATMATE CARDS WITH ILLUSTRATED AVATARS */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: '10px' }}>
          Flatmates Directory (5 Tenants)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map((member) => {
            const isRentPayee = member.id === 'ujwal' || member.name.toLowerCase().includes('ujw');
            const isWashingMachinePayee = member.id === 'manas' || member.name.toLowerCase().includes('manas');
            return (
              <div
                key={member.id}
                className="ios-card"
                style={isRentPayee || isWashingMachinePayee ? { border: '1.5px solid var(--ios-blue)' } : {}}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <FlatmateAvatar id={member.id} customAvatar={member.customAvatar} size={42} />

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                          {member.name}
                        </h3>
                        <span className="status-pill neutral">{member.roomBadge}</span>
                        {isRentPayee && (
                          <span className="status-pill success" style={{ fontWeight: 800 }}>
                            Flat Rent Coordinator
                          </span>
                        )}
                        {isWashingMachinePayee && (
                          <span className="status-pill warning" style={{ fontWeight: 800, background: 'rgba(255, 149, 0, 0.12)', color: '#D97706', border: '1px solid rgba(255, 149, 0, 0.3)' }}>
                            Washing Machine Coordinator
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                        {member.room} • {member.displayPhone}
                      </div>
                    </div>
                  </div>
                </div>

              {/* UPI Line */}
              <div
                className="ios-inset-box"
                style={{
                  margin: '10px 0',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--ios-text-tertiary)', fontWeight: 600 }}>UPI:</span>
                  <strong style={{ color: 'var(--ios-blue)' }}>{member.upiId}</strong>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`upi-${member.id}`, member.upiId)}
                    style={{ background: 'none', border: 'none', color: 'var(--ios-text-secondary)', cursor: 'pointer' }}
                    title="Copy UPI"
                  >
                    {copiedKey === `upi-${member.id}` ? (
                      <MaterialIcon name="check" size={14} color="var(--ios-green)" />
                    ) : (
                      <MaterialIcon name="content_copy" size={13} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEditUpi(member)}
                    style={{ background: 'none', border: 'none', color: 'var(--ios-text-secondary)', cursor: 'pointer' }}
                    title="Edit UPI ID"
                  >
                    <MaterialIcon name="edit" size={14} />
                  </button>
                </div>
              </div>

              {/* Triggers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <a
                  href={`tel:${member.phone}`}
                  className="ios-btn ios-btn-secondary ios-btn-sm"
                  style={{ textDecoration: 'none', justifyContent: 'center' }}
                >
                  <MaterialIcon name="call" size={14} color="var(--ios-green)" /> Call
                </a>

                <a
                  href={`https://wa.me/91${member.phone}?text=${encodeURIComponent(
                    `Hi ${member.name}, message from B-202 Skyra flat app!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ios-btn ios-btn-secondary ios-btn-sm"
                  style={{ textDecoration: 'none', justifyContent: 'center' }}
                >
                  <MaterialIcon name="chat" size={14} color="#25D366" /> WhatsApp
                </a>

                <button
                  type="button"
                  className="ios-btn ios-btn-primary ios-btn-sm"
                  onClick={() => {
                    playHapticChime('click');
                    onOpenQrModal(member);
                  }}
                  id={`open-qr-${member.id}`}
                >
                  <MaterialIcon name="qr_code_2" size={15} /> Pay QR
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* FLAT ADDRESS & BUILDING LOCATION */}
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <MaterialIcon name="location_on" size={18} color="var(--ios-red)" filled /> Flat Address & Location
          </h3>
          <span className="status-pill neutral">Balewadi, Pune</span>
        </div>

        {/* Formatted Address Box */}
        <div
          className="ios-inset-box"
          style={{
            margin: '12px 0 10px 0',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ios-text-primary)', fontSize: '14px', marginBottom: '2px' }}>
                B-202, Skyra Residency
              </div>
              <div style={{ color: 'var(--ios-text-secondary)', lineHeight: 1.45, fontSize: '12.5px' }}>
                Sapphire Park Rd, near Amit Astonia, Balewadi, Pune, 411045
              </div>
            </div>

            <button
              type="button"
              className="ios-btn ios-btn-secondary ios-btn-sm"
              onClick={() => copyToClipboard('flat-address', 'B-202, Skyra Residency, Sapphire Park Rd, near Amit Astonia, Balewadi, Pune, 411045')}
              style={{ whiteSpace: 'nowrap', gap: '4px', height: '32px' }}
              title="Copy Full Address"
            >
              {copiedKey === 'flat-address' ? (
                <>
                  <MaterialIcon name="check" size={14} color="var(--ios-green)" /> Copied
                </>
              ) : (
                <>
                  <MaterialIcon name="content_copy" size={14} /> Copy Address
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--ios-text-tertiary)', borderTop: '1px solid var(--ios-separator)', paddingTop: '8px', marginTop: '2px' }}>
            <MaterialIcon name="local_shipping" size={15} color="var(--ios-blue)" />
            <span>Delivery pin for Swiggy, Zomato, Amazon, Blinkit & Uber</span>
          </div>
        </div>

        {/* Action Triggers: Google Maps & Share Location */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Skyra+Residency,+Sapphire+Park+Rd,+Balewadi,+Pune,+Maharashtra+411045"
            target="_blank"
            rel="noreferrer"
            className="ios-btn ios-btn-primary ios-btn-sm"
            style={{ textDecoration: 'none', justifyContent: 'center' }}
          >
            <MaterialIcon name="map" size={15} /> Open in Maps
          </a>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `📍 *Flat B-202 Address & Location:*\nB-202, Skyra Residency, Sapphire Park Rd, near Amit Astonia, Balewadi, Pune, 411045\n\n🗺️ *Google Maps Link:*\nhttps://maps.google.com/?q=Skyra+Residency,+Sapphire+Park+Rd,+near+Amit+Astonia,+Balewadi,+Pune+411045`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="ios-btn ios-btn-secondary ios-btn-sm"
            style={{ textDecoration: 'none', justifyContent: 'center' }}
          >
            <MaterialIcon name="chat" size={15} color="#25D366" /> Share Location
          </a>
        </div>
      </div>

      {/* FLAT UTILITIES */}
      <div className="ios-card">
        <h3 className="card-title">
          <MaterialIcon name="home" size={18} color="var(--ios-blue)" /> Flat B-202 Info
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          <div
            className="ios-inset-box"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MaterialIcon name="bolt" size={16} color="var(--ios-yellow)" />
              <span>Electricity Consumer No. (MSEDCL)</span>
            </div>
            <strong
              onClick={() => copyToClipboard('mseb', '160221929401')}
              style={{ color: 'var(--ios-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              160221929401{' '}
              {copiedKey === 'mseb' ? (
                <MaterialIcon name="check" size={13} color="var(--ios-green)" />
              ) : (
                <MaterialIcon name="content_copy" size={13} />
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* EDIT UPI MODAL */}
      {editingMember && (
        <div className="modal-backdrop" onClick={() => setEditingMember(null)} style={{ zIndex: 110 }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab-bar" />
            <h2 className="sheet-title">Update UPI ID ({editingMember.name})</h2>
            <div className="ios-input-group" style={{ marginTop: '14px' }}>
              <label className="ios-label">UPI ID</label>
              <input
                className="ios-input"
                value={editUpiInput}
                onChange={(e) => setEditUpiInput(e.target.value)}
                placeholder="mobile@ybl or name@okaxis"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="ios-btn ios-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ios-btn ios-btn-primary"
                style={{ flex: 2 }}
                onClick={handleSaveUpi}
              >
                Save UPI ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
