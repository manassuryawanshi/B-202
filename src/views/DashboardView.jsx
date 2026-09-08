import FlatmateAvatar from '../components/Avatars';
import confetti from 'canvas-confetti';
import { playHapticChime } from '../data/storage';
import { StandardCleaningIcon, RupeeBillIcon } from '../components/AppIcons';
import MaterialIcon from '../components/MaterialIcon';

export default function DashboardView({
  currentUser,
  members,
  areas,
  bills,
  choreHistory,
  messages,
  onNavigateTab,
  onOpenNudgeModal,
  onOpenQrModal,
  onMarkChoreCleaned,
  onMarkBillPaid
}) {
  const userDueBills = bills.filter((b) => !b.payments?.[currentUser?.id]?.paid);
  const totalUserDue = userDueBills.reduce((acc, b) => {
    const share = b.shares?.[currentUser?.id] || b.perPersonAmount || 0;
    return acc + share;
  }, 0);

  const userDueChores = areas.filter((a) => a.currentTurn === currentUser?.id);

  const handleQuickChoreDone = (areaId) => {
    playHapticChime('success');
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.8 }
    });
    onMarkChoreCleaned(areaId, currentUser.id, 'Marked completed from Home');
  };

  return (
    <div className="view-content">
      {/* Apple Vibrant Hero Banner */}
      <div className="apple-banner apple-banner-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                opacity: 0.85,
                marginBottom: '4px'
              }}
            >
              FLAT B-202 • SKYRA RESIDENCY
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.4px', margin: 0 }}>
              Hello, {currentUser?.name}
            </h1>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              {currentUser?.room}
            </div>

            {/* Flat Quick Specs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '8px' }}>
                2 BHK
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '8px' }}>
                5 Tenants
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '8px' }}>
                3 Balconies
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '8px' }}>
                2 Bathrooms
              </span>
            </div>
          </div>

          <div style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.2))' }}>
            <FlatmateAvatar id={currentUser?.id} customAvatar={currentUser?.customAvatar} size={58} />
          </div>
        </div>
      </div>

      {/* Dynamic Duty Alert Banner */}
      {userDueChores.length > 0 ? (
        <div
          className="apple-banner apple-banner-orange"
          style={{ padding: '16px 20px', cursor: 'pointer' }}
          onClick={() => onNavigateTab('chores')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.85 }}>
                ATTENTION REQUIRED
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                Your Turn Today: {userDueChores[0].name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                Tap to open chore checklist & mark completed
              </div>
            </div>
            <button
              className="ios-btn ios-btn-sm"
              style={{ background: '#FFFFFF', color: '#C2410C', fontWeight: 800 }}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickChoreDone(userDueChores[0].id);
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div
          className="apple-banner apple-banner-emerald"
          style={{ padding: '14px 18px', cursor: 'pointer' }}
          onClick={() => onNavigateTab('chores')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MaterialIcon name="check_circle" size={20} filled />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800 }}>All Chores Settled</div>
                <div style={{ fontSize: '11.5px', opacity: 0.9 }}>No cleaning turns pending for you today</div>
              </div>
            </div>
            <MaterialIcon name="chevron_right" size={18} style={{ opacity: 0.8 }} />
          </div>
        </div>
      )}

      {/* Dues & Chores 2-Column Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div
          onClick={() => onNavigateTab('bills')}
          className="ios-card clickable"
          style={{ padding: '16px' }}
        >
          <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Your Pending Dues
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: totalUserDue > 0 ? 'var(--ios-orange)' : 'var(--ios-green)',
              marginTop: '4px'
            }}
          >
            ₹{totalUserDue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ios-text-tertiary)', marginTop: '2px' }}>
            {userDueBills.length} unpaid bills
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('chores')}
          className="ios-card clickable"
          style={{ padding: '16px' }}
        >
          <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Chores Assigned
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: userDueChores.length > 0 ? 'var(--ios-blue)' : 'var(--ios-green)',
              marginTop: '4px'
            }}
          >
            {userDueChores.length > 0 ? `${userDueChores.length} Due` : 'All Clear'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--ios-text-tertiary)', marginTop: '2px' }}>
            {userDueChores.length > 0 ? userDueChores[0].name : 'No turns today'}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        <button
          onClick={() => onNavigateTab('chores')}
          className="ios-card clickable"
          style={{
            padding: '14px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px'
          }}
          id="quick-chores-action"
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--ios-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <StandardCleaningIcon size={20} color="var(--ios-blue)" />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            Chores
          </span>
        </button>

        <button
          onClick={() => onNavigateTab('bills')}
          className="ios-card clickable"
          style={{
            padding: '14px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px'
          }}
          id="quick-bills-action"
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--ios-green-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RupeeBillIcon size={20} color="var(--ios-green)" />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            Pay Bills
          </span>
        </button>

        <button
          onClick={onOpenNudgeModal}
          className="ios-card clickable"
          style={{
            padding: '14px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px'
          }}
          id="quick-nudge-action"
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--ios-orange-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MaterialIcon name="campaign" size={20} color="var(--ios-orange)" />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            Nudge
          </span>
        </button>

        <button
          onClick={() => {
            playHapticChime('click');
            onOpenQrModal(currentUser);
          }}
          className="ios-card clickable"
          style={{
            padding: '14px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px'
          }}
          id="quick-qr-action"
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--ios-purple-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MaterialIcon name="qr_code_2" size={20} color="var(--ios-purple)" />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            My QR
          </span>
        </button>
      </div>

      {/* Up Next Cleaning Turns */}
      <div className="ios-card">
        <div className="card-header-flex">
          <div>
            <h2 className="card-title">
              <StandardCleaningIcon size={17} color="var(--ios-blue)" /> Cleaning Duties
            </h2>
            <div className="card-subtitle">Bathrooms & balconies roster</div>
          </div>
          <button
            onClick={() => onNavigateTab('chores')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ios-blue)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            All <MaterialIcon name="chevron_right" size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {areas.map((area) => {
            const cleaner = members.find((m) => m.id === area.currentTurn);
            const isMyTurn = area.currentTurn === currentUser?.id;

            return (
              <div
                key={area.id}
                className="ios-inset-box"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FlatmateAvatar id={cleaner?.id} customAvatar={cleaner?.customAvatar} size={32} />

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                      {area.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                      Turn: <strong style={{ color: isMyTurn ? 'var(--ios-blue)' : 'inherit' }}>{isMyTurn ? 'YOU' : cleaner?.name}</strong>
                    </div>
                  </div>
                </div>

                {isMyTurn ? (
                  <button
                    className="ios-btn ios-btn-success ios-btn-sm"
                    onClick={() => handleQuickChoreDone(area.id)}
                  >
                    <MaterialIcon name="check_circle" size={14} filled /> Cleaned
                  </button>
                ) : (
                  <span className="status-pill neutral">
                    <MaterialIcon name="schedule" size={13} /> {cleaner?.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Bills Overview */}
      <div className="ios-card">
        <div className="card-header-flex">
          <div>
            <h2 className="card-title">
              <RupeeBillIcon size={17} color="var(--ios-green)" /> Monthly Bills
            </h2>
            <div className="card-subtitle">Rent, electricity, washing machine & other bills</div>
          </div>
          <button
            onClick={() => onNavigateTab('bills')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ios-blue)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            Manage <MaterialIcon name="chevron_right" size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {bills.slice(0, 3).map((bill) => {
            const myShare = bill.shares?.[currentUser?.id] || bill.perPersonAmount || 0;
            const myPayment = bill.payments?.[currentUser?.id];
            const isPaid = myPayment?.paid;

            return (
              <div
                key={bill.id}
                className="ios-inset-box"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    {bill.title}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                    Due: <strong>{bill.dueDate}</strong> • Your Share: <strong>₹{myShare}</strong>
                  </div>
                </div>

                <div>
                  {isPaid ? (
                    <span className="status-pill success">
                      <MaterialIcon name="check_circle" size={13} filled /> Paid
                    </span>
                  ) : (
                    <button
                      className="ios-btn ios-btn-primary ios-btn-sm"
                      onClick={() => {
                        playHapticChime('click');
                        onNavigateTab('bills');
                      }}
                    >
                      Pay ₹{myShare}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
