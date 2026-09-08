import React, { useState } from 'react';
import FlatmateAvatar from '../components/Avatars';
import confetti from 'canvas-confetti';
import { playHapticChime } from '../data/storage';
import { WashingMachineIcon, RupeeBillIcon } from '../components/AppIcons';
import MaterialIcon from '../components/MaterialIcon';

export default function BillsView({
  currentUser,
  members,
  bills,
  onMarkBillPaid,
  onOpenQrModal,
  onOpenNudgeModal,
  onAddNewBill,
  onUpdateCustomShares,
  onDeleteBill,
  onUpdateBill
}) {
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit Bill Modal State
  const [editingBill, setEditingBill] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // In-App Deletion Confirmation Modal State
  const [billToDelete, setBillToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Electricity Amounts Modal (for existing bills)
  const [customEditingBill, setCustomEditingBill] = useState(null);
  const [customShares, setCustomShares] = useState({});

  const [newCategory, setNewCategory] = useState('electricity');
  const [newTitle, setNewTitle] = useState(''); // Only used for 'other'
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-09-15');
  const [newRemarks, setNewRemarks] = useState('');
  const [newCustomShares, setNewCustomShares] = useState({
    manas: 750,
    rohan: 500,
    shubham: 500,
    ujwal: 600,
    prathamesh: 500
  });
  const [newOtherCustomShares, setNewOtherCustomShares] = useState({
    rohan: 0,
    shubham: 0,
    manas: 0,
    ujwal: 0,
    prathamesh: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort bills: Latest at top, deduplicate recurring bills (rent, washing-machine, electricity) per month
  const sortedBills = useMemo(() => {
    const recurringTypes = new Set(['rent', 'washing-machine', 'electricity']);
    const seenRecurring = new Map();
    const deduped = [];

    [...bills].forEach((bill) => {
      const monthKey = (bill.monthYear || '').trim().toLowerCase();
      if (recurringTypes.has(bill.type) && monthKey) {
        const key = `${bill.type}_${monthKey}`;
        if (!seenRecurring.has(key)) {
          seenRecurring.set(key, bill);
          deduped.push({
            ...bill,
            ...(bill.type === 'washing-machine' ? {
              recipientName: 'Manas (Washing Machine Coordinator)',
              recipientUpi: '8010616851@upi'
            } : {})
          });
        } else {
          // Merge payments from duplicate into the existing one
          const existing = seenRecurring.get(key);
          Object.keys(bill.payments || {}).forEach((mId) => {
            if (bill.payments?.[mId]?.paid && !existing.payments?.[mId]?.paid) {
              existing.payments[mId] = bill.payments[mId];
            }
          });
        }
      } else {
        deduped.push(bill);
      }
    });

    return deduped.sort((a, b) => {
      const timeA = a.id.startsWith('bill-') ? parseInt(a.id.replace('bill-', '')) : 0;
      const timeB = b.id.startsWith('bill-') ? parseInt(b.id.replace('bill-', '')) : 0;
      if (timeA && timeB) return timeB - timeA;
      if (timeB && !timeA) return 1;
      if (timeA && !timeB) return -1;
      return (b.dueDate || '').localeCompare(a.dueDate || '');
    });
  }, [bills]);

  const filteredBills = sortedBills.filter((b) => {
    if (filterType === 'all') return true;
    if (filterType === 'other') return b.type === 'other' || b.type === 'repairs';
    return b.type === filterType;
  });

  const handlePayClick = (bill, myShare) => {
    playHapticChime('success');
    confetti({
      particleCount: 65,
      spread: 60,
      origin: { y: 0.75 }
    });
    onMarkBillPaid(bill.id, currentUser.id, myShare);
  };

  const handleOpenCustomEditor = (bill) => {
    playHapticChime('click');
    setCustomEditingBill(bill);
    if (bill.shares && Object.keys(bill.shares).length > 0) {
      setCustomShares(bill.shares);
    } else {
      const equalShare = Math.round((bill.totalAmount || 0) / (members.length || 5));
      const initShares = {};
      members.forEach((m) => {
        initShares[m.id] = equalShare;
      });
      setCustomShares(initShares);
    }
  };

  const handleSaveCustomShares = () => {
    if (customEditingBill) {
      playHapticChime('success');
      onUpdateCustomShares(customEditingBill.id, customShares);
      setCustomEditingBill(null);
    }
  };

  const handleOpenEditBill = (bill) => {
    playHapticChime('click');
    setEditingBill(bill);
    setEditTitle(bill.title);
    setEditTotalAmount(String(bill.totalAmount));
    setEditDueDate(bill.dueDate);
    setEditRemarks(bill.remarks || '');
  };

  const handleSaveEditBill = async (e) => {
    e.preventDefault();
    if (!editingBill) return;
    playHapticChime('success');
    await onUpdateBill({
      billId: editingBill.id,
      title: editTitle.trim(),
      totalAmount: parseFloat(editTotalAmount) || editingBill.totalAmount,
      dueDate: editDueDate,
      remarks: editRemarks.trim()
    });
    setEditingBill(null);
  };

  const handleDeleteBill = (bill) => {
    playHapticChime('pop');
    setBillToDelete(bill);
  };

  const handleConfirmDelete = async () => {
    if (!billToDelete) return;
    setIsDeleting(true);
    try {
      playHapticChime('pop');
      await onDeleteBill(billToDelete.id);
      setBillToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateBill = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalTitle = '';
      let calculatedTotal = parseFloat(newTotalAmount) || 0;
      let sharesObj = {};
      let recipientName = currentUser?.name || 'Flatmate';
      let recipientUpi = currentUser?.upiId || '8010616851@upi';

      if (newCategory === 'electricity') {
        finalTitle = 'Electricity Bill';
        sharesObj = { ...newCustomShares };
        calculatedTotal = Object.values(sharesObj).reduce((a, b) => a + (Number(b) || 0), 0);
        recipientName = 'Electricity Board (MSEDCL)';
        recipientUpi = '8010616851@upi';
      } else if (newCategory === 'rent') {
        finalTitle = 'Flat Rent';
        calculatedTotal = 27000;
        sharesObj = { manas: 9000, rohan: 4500, shubham: 4500, ujwal: 4500, prathamesh: 4500 };
        recipientName = 'Ujwal (Flat Rent Coordinator)';
        recipientUpi = '8669240763@upi';
      } else if (newCategory === 'washing-machine') {
        finalTitle = 'Washing Machine Bill';
        calculatedTotal = 500;
        sharesObj = { manas: 100, rohan: 100, shubham: 100, ujwal: 100, prathamesh: 100 };
        recipientName = 'Manas (Washing Machine Coordinator)';
        recipientUpi = '8010616851@upi';
      } else {
        // 'other'
        finalTitle = newTitle.trim() || 'Other Flat Bill';
        const customSum = Object.values(newOtherCustomShares).reduce((a, b) => a + (Number(b) || 0), 0);
        if (customSum > 0) {
          sharesObj = { ...newOtherCustomShares };
          calculatedTotal = customSum;
        } else {
          const total = parseFloat(newTotalAmount) || 0;
          calculatedTotal = total;
          const each = Math.round(total / (members.length || 5));
          members.forEach((m) => { sharesObj[m.id] = each; });
        }
      }

      // Build initial payments object
      const initialPayments = {};
      members.forEach((m) => {
        initialPayments[m.id] = {
          paid: false,
          amount: sharesObj[m.id] || Math.round(calculatedTotal / members.length),
          date: null,
          utr: ''
        };
      });

      const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const newBill = {
        id: `bill-${Date.now()}`,
        title: finalTitle,
        type: newCategory,
        totalAmount: calculatedTotal,
        dueDate: newDueDate,
        monthYear: currentMonthYear,
        remarks: newRemarks.trim(),
        creatorId: currentUser?.id || 'manas',
        recipientName,
        recipientUpi,
        isCustomSplit: Object.keys(sharesObj).length > 0,
        shares: sharesObj,
        payments: initialPayments,
        updatedAt: Date.now()
      };

      playHapticChime('success');
      confetti({ particleCount: 50, spread: 60 });
      onAddNewBill(newBill);
      setShowAddModal(false);
      setNewTitle('');
      setNewRemarks('');
      setNewTotalAmount('');
    } catch (err) {
      console.error(err);
      alert('Error creating bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (type, size = 18) => {
    switch (type) {
      case 'rent':
        return <MaterialIcon name="home" size={size} color="#007AFF" />;
      case 'electricity':
        return <MaterialIcon name="bolt" size={size} color="#FF9500" />;
      case 'washing-machine':
        return <WashingMachineIcon size={size} color="#30B0C7" />;
      case 'other':
      case 'repairs':
      default:
        return <RupeeBillIcon size={size} color="#AF52DE" />;
    }
  };

  return (
    <div className="view-content">
      {/* Header: Title & Clean + Add Bill Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
            Monthly Bills
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
            Latest bills at top • Rent, electricity, washing & others
          </div>
        </div>

        <button
          onClick={() => {
            playHapticChime('click');
            setShowAddModal(true);
          }}
          id="add-bill-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '8px 14px',
            height: '36px',
            borderRadius: '18px',
            background: 'var(--ios-blue)',
            color: '#fff',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <MaterialIcon name="add" size={15} color="#fff" /> Add Bill
        </button>
      </div>

      {/* Flat Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
        <button
          onClick={() => {
            playHapticChime('click');
            setFilterType('all');
          }}
          className={`flat-filter-pill ${filterType === 'all' ? 'active' : ''}`}
        >
          All ({bills.length})
        </button>

        <button
          onClick={() => {
            playHapticChime('click');
            setFilterType('rent');
          }}
          className={`flat-filter-pill ${filterType === 'rent' ? 'active' : ''}`}
        >
          <MaterialIcon name="home" size={14} /> Rent
        </button>

        <button
          onClick={() => {
            playHapticChime('click');
            setFilterType('electricity');
          }}
          className={`flat-filter-pill ${filterType === 'electricity' ? 'active' : ''}`}
        >
          <MaterialIcon name="bolt" size={14} /> Electricity
        </button>

        <button
          onClick={() => {
            playHapticChime('click');
            setFilterType('washing-machine');
          }}
          className={`flat-filter-pill ${filterType === 'washing-machine' ? 'active' : ''}`}
        >
          <WashingMachineIcon size={14} /> Washing Machine
        </button>

        <button
          onClick={() => {
            playHapticChime('click');
            setFilterType('other');
          }}
          className={`flat-filter-pill ${filterType === 'other' ? 'active' : ''}`}
        >
          <RupeeBillIcon size={13} /> Other Bills
        </button>
      </div>

      {/* Bill List (Latest at Top, Visual Differentiation between Paid & Unpaid) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredBills.map((bill) => {
          const myShare = bill.shares?.[currentUser.id] || bill.perPersonAmount || 0;
          const myPayment = bill.payments?.[currentUser.id];
          const isMyPaid = myPayment?.paid;
          const paidCount = Object.values(bill.payments || {}).filter((p) => p.paid).length;
          const isAllPaid = paidCount === members.length;

          const isDefaultBill =
            bill.type === 'rent' ||
            bill.type === 'washing-machine' ||
            bill.creatorId === 'system' ||
            bill.title?.toLowerCase().includes('rent') ||
            bill.title?.toLowerCase().includes('washing');
          const canManageThisBill = !isDefaultBill && (bill.creatorId === currentUser?.id || currentUser?.id === 'manas' || !bill.creatorId);
          const canEditShares = bill.type === 'electricity' || (!isDefaultBill && (bill.creatorId === currentUser?.id || currentUser?.id === 'manas'));

          return (
            <div
              key={bill.id}
              className="ios-card"
              style={{
                padding: '14px',
                border: isMyPaid
                  ? '1px solid var(--ios-card-border)'
                  : '1.5px solid var(--ios-orange)',
                boxShadow: isMyPaid ? '0 1px 3px rgba(0,0,0,0.03)' : '0 2px 8px rgba(249, 115, 22, 0.08)'
              }}
            >
              {/* Header: Icon, Title & Top Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '11px',
                      background: 'var(--ios-card-inset)',
                      border: '1px solid var(--ios-card-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {getCategoryIcon(bill.type, 20)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--ios-text-primary)',
                        margin: 0,
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {bill.title}
                    </h3>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--ios-text-secondary)',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Pay to: <strong>{bill.recipientName}</strong>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  {isMyPaid ? (
                    <span className="status-pill success" style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px' }}>
                      <MaterialIcon name="check_circle" size={13} filled /> Paid
                    </span>
                  ) : (
                    <span className="status-pill warning" style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px' }}>
                      <MaterialIcon name="schedule" size={13} /> ₹{myShare.toLocaleString('en-IN')} Due
                    </span>
                  )}

                  {canManageThisBill && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <button
                        onClick={() => handleOpenEditBill(bill)}
                        style={{
                          background: 'var(--ios-card-inset)',
                          border: '1px solid var(--ios-card-border)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--ios-blue)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title="Edit bill"
                        id={`edit-bill-${bill.id}`}
                      >
                        <MaterialIcon name="edit" size={11} /> Edit
                      </button>

                      <button
                        onClick={() => handleDeleteBill(bill)}
                        style={{
                          background: 'rgba(255, 59, 48, 0.08)',
                          border: '1px solid rgba(255, 59, 48, 0.25)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--ios-red)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title="Delete bill"
                        id={`delete-bill-${bill.id}`}
                      >
                        <MaterialIcon name="delete" size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {bill.remarks && (
                <div style={{ fontSize: '11px', color: 'var(--ios-text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                  Note: {bill.remarks}
                </div>
              )}

              {/* Compact 3-Metric Glanceable Summary Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '4px',
                  background: 'var(--ios-card-inset)',
                  borderRadius: '11px',
                  padding: '8px 6px',
                  margin: '10px 0 8px 0',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--ios-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Total Bill
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ios-text-primary)', marginTop: '2px' }}>
                    ₹{bill.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid var(--ios-card-border)', borderRight: '1px solid var(--ios-card-border)' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--ios-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Your Share
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: isMyPaid ? 'var(--ios-green)' : 'var(--ios-orange)', marginTop: '2px' }}>
                    ₹{myShare.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--ios-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Due Date
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-secondary)', marginTop: '3px' }}>
                    {bill.dueDate}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ margin: '8px 0 10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--ios-text-tertiary)', fontWeight: 600 }}>Flatmates Paid</span>
                  <span style={{ color: isAllPaid ? 'var(--ios-green)' : 'var(--ios-orange)', fontWeight: 700 }}>
                    {paidCount} of 5 Settled
                  </span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: 'var(--ios-card-inset)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(paidCount / 5) * 100}%`,
                      background: isAllPaid ? 'var(--ios-green)' : 'var(--ios-blue)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Per-Flatmate Matrix */}
              <div className="ios-inset-box" style={{ margin: '8px 0 10px 0', padding: '9px 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ios-text-tertiary)', letterSpacing: '0.4px' }}>
                    Flatmates Breakdown
                  </span>

                  {canEditShares && (
                    <button
                      onClick={() => handleOpenCustomEditor(bill)}
                      style={{
                        background: 'var(--ios-blue-light)',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10.5px',
                        color: 'var(--ios-blue)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      id={`edit-shares-${bill.id}`}
                    >
                      <MaterialIcon name="tune" size={12} /> Edit Shares
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {members.map((member) => {
                    const shareAmt = bill.shares?.[member.id] || bill.perPersonAmount || 0;
                    const payInfo = bill.payments?.[member.id];
                    const hasPaid = payInfo?.paid;
                    const isUser = member.id === currentUser.id;

                    return (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '2px 0',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                          <FlatmateAvatar id={member.id} customAvatar={member.customAvatar} size={20} />
                          <span
                            style={{
                              fontWeight: isUser ? 800 : 600,
                              color: 'var(--ios-text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {member.name} {isUser && '(You)'}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--ios-text-tertiary)', flexShrink: 0 }}>
                            {member.roomBadge}
                          </span>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: '6px' }}>
                          {hasPaid ? (
                            <span className="status-pill success" style={{ fontSize: '10.5px', padding: '2px 6px', gap: '3px' }}>
                              <MaterialIcon name="check_circle" size={11} filled /> Paid (₹{shareAmt})
                            </span>
                          ) : (
                            <span className="status-pill warning" style={{ fontSize: '10.5px', padding: '2px 6px', gap: '3px' }}>
                              <MaterialIcon name="schedule" size={11} /> ₹{shareAmt} Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {!isMyPaid ? (
                  <button
                    className="ios-btn ios-btn-success"
                    style={{
                      flex: 1.3,
                      height: '38px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      padding: '0 8px',
                      gap: '4px'
                    }}
                    onClick={() => handlePayClick(bill, myShare)}
                    id={`pay-share-${bill.id}`}
                  >
                    <MaterialIcon name="check_circle" size={15} filled /> Mark Paid (₹{myShare})
                  </button>
                ) : (
                  <button
                    className="ios-btn ios-btn-secondary"
                    style={{
                      flex: 1.3,
                      height: '38px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      opacity: 0.85,
                      padding: '0 8px',
                      gap: '4px'
                    }}
                    disabled
                  >
                    <MaterialIcon name="check_circle" size={15} color="var(--ios-green)" filled /> Paid (₹{myShare})
                  </button>
                )}

                <button
                  className="ios-btn ios-btn-secondary"
                  style={{
                    flex: 0.9,
                    height: '38px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    padding: '0 8px',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => {
                    playHapticChime('click');
                    onOpenQrModal({
                      name: bill.recipientName,
                      upiId: bill.recipientUpi,
                      defaultAmount: myShare,
                      title: bill.title,
                      billId: bill.id
                    });
                  }}
                  id={`qr-bill-${bill.id}`}
                >
                  <MaterialIcon name="qr_code_2" size={15} /> Pay QR
                </button>

                <button
                  className="ios-btn ios-btn-secondary"
                  style={{
                    width: '38px',
                    height: '38px',
                    padding: 0,
                    flexShrink: 0
                  }}
                  onClick={onOpenNudgeModal}
                  title="Remind flatmates"
                  id={`nudge-bill-${bill.id}`}
                >
                  <MaterialIcon name="campaign" size={17} color="var(--ios-orange)" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SIMPLIFIED ADD BILL MODAL (Strictly 4 categories: Electricity, Rent, Washing Machine, Other Bills) */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)} style={{ zIndex: 110 }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab-bar" />
            <div className="sheet-header">
              <h2 className="sheet-title">Add Flat Bill</h2>
              <button className="sheet-close-btn" onClick={() => setShowAddModal(false)}>
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBill}>
              {/* Info notice */}
              <div
                style={{
                  background: 'var(--ios-card-inset)',
                  border: '1px solid var(--ios-card-border-soft)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: 'var(--ios-text-secondary)',
                  lineHeight: 1.4
                }}
              >
                <strong style={{ color: 'var(--ios-text-primary)' }}>One bill per type per month.</strong> Rent, Electricity & Washing Machine can only be added once per month.
              </div>

              {/* Category selector (Electricity, Rent, Washing Machine, Other Bills) */}
              <div className="ios-input-group">
                <label className="ios-label">Bill Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {(() => {
                    const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    const rentAlreadyExists = bills.some((b) => b.type === 'rent' && (b.monthYear === currentMonthYear || b.title.toLowerCase().includes('rent')));
                    const wmAlreadyExists = bills.some((b) => b.type === 'washing-machine' && (b.monthYear === currentMonthYear || b.title.toLowerCase().includes('washing')));
                    const elecAlreadyExists = bills.some((b) => b.type === 'electricity' && b.monthYear === currentMonthYear);

                    return [
                      { id: 'electricity', label: 'Electricity', iconName: 'bolt', disabled: elecAlreadyExists, sublabel: elecAlreadyExists ? 'Active' : '' },
                      { id: 'rent', label: 'Rent', iconName: 'home', disabled: rentAlreadyExists, sublabel: rentAlreadyExists ? 'Active' : '' },
                      { id: 'washing-machine', label: 'Washing', iconName: 'local_laundry_service', disabled: wmAlreadyExists, sublabel: wmAlreadyExists ? 'Active' : '' },
                      { id: 'other', label: 'Other', iconName: 'currency_rupee', disabled: false }
                    ].map((cat) => {
                      const isSel = newCategory === cat.id;
                      const isDis = cat.disabled;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={isDis}
                          onClick={() => {
                            if (!isDis) setNewCategory(cat.id);
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '10px 4px',
                            borderRadius: '14px',
                            border: isSel ? '2px solid var(--ios-blue)' : '1px solid var(--ios-card-border)',
                            background: isDis ? 'var(--ios-card-inset)' : isSel ? 'var(--ios-active-pill-bg, #EFF6FF)' : 'var(--ios-card)',
                            color: isDis ? 'var(--ios-text-tertiary)' : isSel ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                            opacity: isDis ? 0.6 : 1,
                            fontWeight: isSel ? 800 : 600,
                            fontSize: '11px',
                            cursor: isDis ? 'not-allowed' : 'pointer'
                          }}
                          title={isDis ? `${cat.label} already active for this month` : ''}
                          id={`add-category-${cat.id}`}
                        >
                          <MaterialIcon name={cat.iconName} size={20} />
                          <span>{cat.label}</span>
                          {cat.sublabel && (
                            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--ios-orange)' }}>
                              {cat.sublabel}
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Title input: ONLY displayed for 'other' bills! */}
              {newCategory === 'other' && (
                <div className="ios-input-group">
                  <label className="ios-label">Bill Title</label>
                  <input
                    className="ios-input"
                    placeholder="e.g. Water Tanker, Plumber, Society Maintenance"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
              )}

              {/* Remarks / Notes for all categories */}
              <div className="ios-input-group">
                <label className="ios-label">Remarks / Description</label>
                <input
                  className="ios-input"
                  placeholder="e.g. September share, geyser repair, AC usage"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                />
              </div>

              {/* Category specific details */}
              {newCategory === 'electricity' && (
                <div className="ios-input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="ios-label" style={{ margin: 0 }}>Custom Share per Flatmate</label>
                    <span style={{ fontSize: '12px', color: 'var(--ios-blue)', fontWeight: 800 }}>
                      Total: ₹{Object.values(newCustomShares).reduce((a, b) => a + (Number(b) || 0), 0)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {members.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          background: 'var(--ios-card-inset)',
                          borderRadius: '12px',
                          border: '1px solid var(--ios-card-border-soft)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FlatmateAvatar id={m.id} customAvatar={m.customAvatar} size={24} />
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{m.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>₹</span>
                          <input
                            type="number"
                            value={newCustomShares[m.id] ?? ''}
                            onChange={(e) =>
                              setNewCustomShares({
                                ...newCustomShares,
                                [m.id]: parseFloat(e.target.value) || 0
                              })
                            }
                            style={{
                              width: '85px',
                              padding: '5px 8px',
                              fontSize: '13.5px',
                              fontWeight: 800,
                              textAlign: 'right',
                              background: 'var(--ios-card)',
                              color: 'var(--ios-text-primary)',
                              border: '1px solid var(--ios-card-border)',
                              borderRadius: '8px',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {newCategory === 'other' && (
                <>
                  <div className="grid-2">
                    <div className="ios-input-group">
                      <label className="ios-label">Total Amount (₹)</label>
                      <input
                        type="number"
                        className="ios-input"
                        placeholder="e.g. 1500"
                        required
                        value={newTotalAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTotalAmount(val);
                          const tot = parseFloat(val) || 0;
                          const perPerson = Math.round(tot / (members.length || 5));
                          const autoShares = {};
                          members.forEach((m) => {
                            autoShares[m.id] = perPerson;
                          });
                          setNewOtherCustomShares(autoShares);
                        }}
                      />
                    </div>

                    <div className="ios-input-group">
                      <label className="ios-label">Due Date</label>
                      <input
                        type="date"
                        className="ios-input"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* CUSTOM AMOUNT PER FLATMATE SECTION FOR OTHER BILLS */}
                  <div className="ios-input-group" style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="ios-label" style={{ margin: 0 }}>Custom Share per Flatmate</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const tot = parseFloat(newTotalAmount) || 0;
                            const perPerson = Math.round(tot / (members.length || 5));
                            const autoShares = {};
                            members.forEach((m) => {
                              autoShares[m.id] = perPerson;
                            });
                            setNewOtherCustomShares(autoShares);
                          }}
                          style={{
                            background: 'var(--ios-card-inset)',
                            border: '1px solid var(--ios-card-border)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--ios-blue)',
                            cursor: 'pointer'
                          }}
                        >
                          Split Equally
                        </button>
                        <span style={{ fontSize: '12px', color: 'var(--ios-blue)', fontWeight: 800 }}>
                          Total: ₹{Object.values(newOtherCustomShares).reduce((a, b) => a + (Number(b) || 0), 0) || newTotalAmount || 0}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {members.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            background: 'var(--ios-card-inset)',
                            borderRadius: '12px',
                            border: '1px solid var(--ios-card-border-soft)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FlatmateAvatar id={m.id} customAvatar={m.customAvatar} size={24} />
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>{m.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>₹</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={newOtherCustomShares[m.id] ?? ''}
                              onChange={(e) => {
                                const updated = {
                                  ...newOtherCustomShares,
                                  [m.id]: parseFloat(e.target.value) || 0
                                };
                                setNewOtherCustomShares(updated);
                                const sum = Object.values(updated).reduce((a, b) => a + (Number(b) || 0), 0);
                                setNewTotalAmount(String(sum));
                              }}
                              style={{
                                width: '85px',
                                padding: '5px 8px',
                                fontSize: '13.5px',
                                fontWeight: 800,
                                textAlign: 'right',
                                background: 'var(--ios-card)',
                                color: 'var(--ios-text-primary)',
                                border: '1px solid var(--ios-card-border)',
                                borderRadius: '8px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {newCategory !== 'other' && (
                <div className="ios-input-group">
                  <label className="ios-label">Due Date</label>
                  <input
                    type="date"
                    className="ios-input"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="ios-btn ios-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-btn ios-btn-primary"
                  style={{ flex: 2 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save & Persist Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOM SHARES MODAL (Electricity & Other Bills) */}
      {customEditingBill && (
        <div className="modal-backdrop" onClick={() => setCustomEditingBill(null)} style={{ zIndex: 110 }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab-bar" />
            <div className="sheet-header">
              <h2 className="sheet-title">Edit Shares: {customEditingBill.title}</h2>
              <button className="sheet-close-btn" onClick={() => setCustomEditingBill(null)}>
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FlatmateAvatar id={m.id} size={28} />
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                      {m.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>₹</span>
                    <input
                      type="number"
                      className="ios-input"
                      style={{ width: '90px', padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}
                      value={customShares[m.id] ?? 0}
                      onChange={(e) =>
                        setCustomShares((prev) => ({
                          ...prev,
                          [m.id]: Number(e.target.value) || 0
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Total Calculated</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-blue)' }}>
                ₹{Object.values(customShares).reduce((acc, val) => acc + (Number(val) || 0), 0)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="ios-btn ios-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setCustomEditingBill(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ios-btn ios-btn-primary"
                style={{ flex: 2 }}
                onClick={handleSaveCustomShares}
              >
                Save Shares
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BILL MODAL (Creator Only) */}
      {editingBill && (
        <div className="modal-backdrop" onClick={() => setEditingBill(null)} style={{ zIndex: 110 }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab-bar" />
            <div className="sheet-header">
              <h2 className="sheet-title">Edit Bill Details</h2>
              <button className="sheet-close-btn" onClick={() => setEditingBill(null)}>
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditBill}>
              <div className="ios-input-group">
                <label className="ios-label">Bill Title</label>
                <input
                  className="ios-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="ios-input-group">
                  <label className="ios-label">Total Amount (₹)</label>
                  <input
                    type="number"
                    className="ios-input"
                    value={editTotalAmount}
                    onChange={(e) => setEditTotalAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="ios-input-group">
                  <label className="ios-label">Due Date</label>
                  <input
                    type="date"
                    className="ios-input"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ios-input-group">
                <label className="ios-label">Remarks / Description</label>
                <input
                  className="ios-input"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Optional note"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="ios-btn ios-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingBill(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-btn ios-btn-primary"
                  style={{ flex: 2 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP BILL DELETION CONFIRMATION MODAL */}
      {billToDelete && (
        <div
          className="modal-backdrop"
          onClick={() => !isDeleting && setBillToDelete(null)}
          style={{ zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="ios-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '380px',
              width: '90%',
              margin: 'auto',
              padding: '22px 20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.22)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(255, 59, 48, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <MaterialIcon name="delete" size={22} color="var(--ios-red)" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--ios-text-primary)' }}>
                  Delete Flat Bill?
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--ios-text-tertiary)' }}>Permanent Action</div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to delete <strong>"{billToDelete.title}"</strong> (₹{billToDelete.totalAmount?.toLocaleString('en-IN')})? This will remove the bill and all its share records for B-202.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="ios-btn ios-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setBillToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ios-btn ios-btn-danger"
                style={{
                  flex: 1.3,
                  background: 'var(--ios-red)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                id="confirm-delete-bill-btn"
              >
                {isDeleting ? 'Deleting...' : 'Delete Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
