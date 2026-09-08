import React, { useState } from 'react';
import { playHapticChime } from '../data/storage';
import MaterialIcon from '../components/MaterialIcon';

export default function CalendarView({
  bills,
  choreHistory,
  members
}) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  const eventsByDate = {};

  const addEvent = (dateStr, event) => {
    if (!dateStr) return;
    const key = dateStr.slice(0, 10);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(event);
  };

  // Bills: Arrival & Due dates
  bills.forEach((bill) => {
    if (bill.billArrivedDate) {
      addEvent(bill.billArrivedDate, {
        type: 'bill-arrived',
        title: `${bill.title} Arrived`,
        description: `Total ₹${bill.totalAmount.toLocaleString('en-IN')}`,
        badge: 'Arrived',
        color: 'var(--ios-orange)'
      });
    }

    if (bill.dueDate) {
      addEvent(bill.dueDate, {
        type: 'bill-due',
        title: `${bill.title} Due Date`,
        description: `Payment due date for flatmates`,
        badge: 'Due Date',
        color: 'var(--ios-red)'
      });
    }

    Object.entries(bill.payments || {}).forEach(([memberId, payData]) => {
      if (payData.paid && payData.date) {
        const member = members.find((m) => m.id === memberId);
        addEvent(payData.date, {
          type: 'member-paid',
          title: `${member?.name || 'Member'} Paid ${bill.title}`,
          description: `₹${payData.amount || bill.perPersonAmount || ''} paid via UPI`,
          badge: 'Paid',
          color: 'var(--ios-green)'
        });
      }
    });
  });

  // Chores
  choreHistory.forEach((chore) => {
    addEvent(chore.date, {
      type: 'chore-done',
      title: `${chore.areaName} Cleaned`,
      description: `By ${chore.cleanedByName} • "${chore.notes || 'Routine cleaning'}"`,
      badge: 'Chore Done',
      color: 'var(--ios-blue)'
    });
  });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    playHapticChime('click');
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    playHapticChime('click');
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const selectedDateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
    selectedDay
  ).padStart(2, '0')}`;

  const selectedDayEvents = eventsByDate[selectedDateKey] || [];

  return (
    <div className="view-content">
      {/* Monthly Calendar Card */}
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
              Track bills, due dates & cleaning logs
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handlePrevMonth}
              className="nav-icon-btn"
              style={{ width: '32px', height: '32px' }}
            >
              <MaterialIcon name="chevron_left" size={18} />
            </button>
            <button
              onClick={() => {
                playHapticChime('click');
                setCurrentYear(2026);
                setCurrentMonth(8);
                setSelectedDay(1);
              }}
              className="ios-btn ios-btn-secondary ios-btn-sm"
              style={{ padding: '3px 9px', fontSize: '11.5px' }}
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="nav-icon-btn"
              style={{ width: '32px', height: '32px' }}
            >
              <MaterialIcon name="chevron_right" size={18} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--ios-text-secondary)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--ios-separator)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ios-green)' }} />
            <span>Payments</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ios-orange)' }} />
            <span>Due Dates</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ios-blue)' }} />
            <span>Chores Done</span>
          </div>
        </div>

        {/* Days of Week Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--ios-text-tertiary)',
            marginBottom: '6px'
          }}
        >
          <span>SUN</span>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
        </div>

        {/* Day Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: '44px' }} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
              dayNum
            ).padStart(2, '0')}`;
            const dayEvents = eventsByDate[dateKey] || [];
            const isSelected = selectedDay === dayNum;

            const hasPayment = dayEvents.some((e) => e.type === 'member-paid');
            const hasBill = dayEvents.some((e) => e.type === 'bill-due' || e.type === 'bill-arrived');
            const hasChore = dayEvents.some((e) => e.type === 'chore-done');

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => {
                  playHapticChime('click');
                  setSelectedDay(dayNum);
                }}
                style={{
                  height: '44px',
                  background: isSelected ? 'var(--ios-blue)' : dayEvents.length > 0 ? '#F8FAFC' : 'transparent',
                  border: isSelected
                    ? '1.5px solid var(--ios-blue-dark)'
                    : '1px solid var(--ios-card-border-soft)',
                  borderRadius: '10px',
                  color: isSelected ? '#FFFFFF' : 'var(--ios-text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 6px rgba(11, 87, 228, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 600 }}>{dayNum}</span>

                <div style={{ display: 'flex', gap: '3px', marginTop: '2px', height: '4px' }}>
                  {hasPayment && (
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#fff' : 'var(--ios-green)' }} />
                  )}
                  {hasBill && (
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#fff' : 'var(--ios-orange)' }} />
                  )}
                  {hasChore && (
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#fff' : 'var(--ios-blue)' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspector */}
      <div className="ios-card">
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)', marginBottom: '8px' }}>
          Activity on {selectedDay} {monthNames[currentMonth]} {currentYear}
        </h3>

        {selectedDayEvents.length === 0 ? (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--ios-text-tertiary)', fontSize: '13px' }}>
            No recorded dues or chore completions for this date.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedDayEvents.map((evt, idx) => (
              <div key={idx} className="ios-inset-box" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: evt.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {evt.type === 'member-paid' && <MaterialIcon name="check_circle" size={16} filled />}
                  {evt.type === 'bill-due' && <MaterialIcon name="schedule" size={16} />}
                  {evt.type === 'bill-arrived' && <MaterialIcon name="bolt" size={16} />}
                  {evt.type === 'chore-done' && <MaterialIcon name="cleaning_services" size={16} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                      {evt.title}
                    </div>
                    <span className="status-pill neutral" style={{ fontSize: '10px' }}>
                      {evt.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                    {evt.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
