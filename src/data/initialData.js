export const FLAT_INFO = {
  flatNumber: "B-202",
  society: "Skyra Residency",
  type: "2 BHK",
  description: "2 Hall tenants, 1 Bedroom tenant, 2 Attached Bedroom tenants. 3 Balconies, 2 Bathrooms."
};

export const FLATMATE_MEMBERS = [
  {
    id: "rohan",
    name: "Rohan",
    phone: "8766688102",
    displayPhone: "87666 88102",
    room: "Living Hall",
    roomBadge: "Hall",
    roomType: "hall",
    upiId: "8766688102@upi",
    avatarColor: "#FF3B30", // iOS Red
    initials: "RO",
    avatarEmoji: ""
  },
  {
    id: "shubham",
    name: "Shubham",
    phone: "8237580043",
    displayPhone: "82375 80043",
    room: "Living Hall",
    roomBadge: "Hall",
    roomType: "hall",
    upiId: "8237580043@upi",
    avatarColor: "#FF9500", // iOS Orange
    initials: "SH",
    avatarEmoji: "🛋️"
  },
  {
    id: "manas",
    name: "Manas",
    phone: "8010616851",
    displayPhone: "80106 16851",
    room: "Bedroom 1",
    roomBadge: "Bed 1",
    roomType: "bedroom1",
    upiId: "8010616851@upi",
    avatarColor: "#007AFF", // iOS Blue
    initials: "MA",
    avatarEmoji: ""
  },
  {
    id: "ujwal",
    name: "Ujwal",
    phone: "8669240763",
    displayPhone: "86692 40763",
    room: "Bedroom 2 (Attached Bath)",
    roomBadge: "Bed 2 + Bath",
    roomType: "bedroom2",
    upiId: "8669240763@upi",
    avatarColor: "#34C759", // iOS Green
    initials: "UJ",
    avatarEmoji: ""
  },
  {
    id: "prathamesh",
    name: "Prathamesh",
    phone: "8459692494",
    displayPhone: "84596 92494",
    room: "Bedroom 2 (Attached Bath)",
    roomBadge: "Bed 2 + Bath",
    roomType: "bedroom2",
    upiId: "8459692494@upi",
    avatarColor: "#AF52DE", // iOS Purple
    initials: "PR",
    avatarEmoji: "🚿"
  }
];

export const OWNER_DETAILS = {
  name: "Mr. Ajit Thakkar",
  title: "Flat Owner (B-202)",
  phone: "9822012345",
  displayPhone: "+91 98220 12345",
  upiId: "skyra.b202@okhdfcbank",
  bankName: "HDFC Bank",
  accountNumber: "50100492817291",
  ifsc: "HDFC0001234",
  monthlyRent: 27000,
  dueDay: 5,
  depositAmount: 100000,
  notes: "Pay rent strictly by 5th of each month. Always attach payment UTR/screenshot on WhatsApp.",
  whatsappLink: "https://wa.me/919822012345?text=Hi%20Ajit%20ji,%20Rent%20for%20B-202%20Skyra%20Residency%20is%20paid."
};

export const CLEANING_AREAS = [
  {
    id: "common-bath",
    name: "Common Bathroom",
    type: "Bathroom",
    location: "Hallway / Near Bed 1",
    usedBy: "Hall (Rohan, Shubham) & Bed 1 (Manas)",
    suggestedCycle: "Every 4-5 days",
    rotationOrder: ["rohan", "shubham", "manas", "ujwal", "prathamesh"],
    currentTurn: "rohan",
    nextTurn: "shubham",
    lastCleaned: "2026-08-28T14:30:00.000Z",
    lastCleanedBy: "manas"
  },
  {
    id: "attached-bath",
    name: "Attached Bathroom",
    type: "Bathroom",
    location: "Inside Bedroom 2",
    usedBy: "Bedroom 2 (Ujwal & Prathamesh)",
    suggestedCycle: "Weekly",
    rotationOrder: ["ujwal", "prathamesh"],
    currentTurn: "ujwal",
    nextTurn: "prathamesh",
    lastCleaned: "2026-08-29T18:00:00.000Z",
    lastCleanedBy: "prathamesh"
  },
  {
    id: "hall-balcony",
    name: "Hall Balcony",
    type: "Balcony",
    location: "Connected to Living Hall",
    usedBy: "All Flatmates",
    suggestedCycle: "Weekly",
    rotationOrder: ["shubham", "rohan", "manas", "prathamesh", "ujwal"],
    currentTurn: "shubham",
    nextTurn: "rohan",
    lastCleaned: "2026-08-26T11:00:00.000Z",
    lastCleanedBy: "rohan"
  },
  {
    id: "kitchen-balcony",
    name: "Kitchen Balcony",
    type: "Balcony",
    location: "Connected to Kitchen (Utility area)",
    usedBy: "All Flatmates (Washing Machine area)",
    suggestedCycle: "Weekly",
    rotationOrder: ["manas", "ujwal", "prathamesh", "rohan", "shubham"],
    currentTurn: "manas",
    nextTurn: "ujwal",
    lastCleaned: "2026-08-27T10:15:00.000Z",
    lastCleanedBy: "ujwal"
  },
  {
    id: "common-balcony",
    name: "Bedroom Balcony",
    type: "Balcony",
    location: "Common between both bedrooms",
    usedBy: "Bedroom 1 & 2",
    suggestedCycle: "Weekly",
    rotationOrder: ["prathamesh", "ujwal", "manas"],
    currentTurn: "prathamesh",
    nextTurn: "ujwal",
    lastCleaned: "2026-08-25T17:45:00.000Z",
    lastCleanedBy: "manas"
  }
];

export const INITIAL_CHORE_HISTORY = [
  {
    id: "chore-1",
    areaId: "attached-bath",
    areaName: "Attached Bathroom",
    cleanedBy: "prathamesh",
    cleanedByName: "Prathamesh",
    date: "2026-08-29T18:00:00.000Z",
    notes: "Scrubbed floor, cleaned mirrors and replaced toilet block."
  },
  {
    id: "chore-2",
    areaId: "common-bath",
    areaName: "Common Bathroom",
    cleanedBy: "manas",
    cleanedByName: "Manas",
    date: "2026-08-28T14:30:00.000Z",
    notes: "Deep cleaned tiles and bucket."
  },
  {
    id: "chore-3",
    areaId: "kitchen-balcony",
    areaName: "Kitchen Balcony",
    cleanedBy: "ujwal",
    cleanedByName: "Ujwal",
    date: "2026-08-27T10:15:00.000Z",
    notes: "Mopped dust from washing machine drain area."
  },
  {
    id: "chore-4",
    areaId: "hall-balcony",
    areaName: "Hall Balcony",
    cleanedBy: "rohan",
    cleanedByName: "Rohan",
    date: "2026-08-26T11:00:00.000Z",
    notes: "Swept leaves and washed floor."
  },
  {
    id: "chore-5",
    areaId: "common-balcony",
    areaName: "Bedroom Balcony",
    cleanedBy: "manas",
    cleanedByName: "Manas",
    date: "2026-08-25T17:45:00.000Z",
    notes: "Cleaned glass doors and balcony railing."
  },
  {
    id: "chore-6",
    areaId: "common-bath",
    areaName: "Common Bathroom",
    cleanedBy: "shubham",
    cleanedByName: "Shubham",
    date: "2026-08-22T09:30:00.000Z",
    notes: "Weekend bathroom cleanup."
  },
  {
    id: "chore-7",
    areaId: "attached-bath",
    areaName: "Attached Bathroom",
    cleanedBy: "ujwal",
    cleanedByName: "Ujwal",
    date: "2026-08-21T20:00:00.000Z",
    notes: "Cleaned basin and shower."
  }
];

export const INITIAL_BILLS = [
  {
    id: "rent-sep-2026",
    title: "September Flat Rent",
    type: "rent",
    totalAmount: 27000,
    dueDate: "2026-09-05",
    monthYear: "Sep 2026",
    recipientName: "Ujwal (Flat Rent Coordinator)",
    recipientUpi: "8669240763@upi",
    isCustomSplit: true,
    creatorId: "system",
    shares: {
      manas: 9000,
      rohan: 4500,
      shubham: 4500,
      ujwal: 4500,
      prathamesh: 4500
    },
    payments: {
      manas: { paid: true, amount: 9000, date: "2026-09-01T12:00:00.000Z", utr: "9021884120" },
      rohan: { paid: true, amount: 4500, date: "2026-09-01T15:30:00.000Z", utr: "9021894411" },
      shubham: { paid: false, amount: 4500, date: null, utr: "" },
      ujwal: { paid: false, amount: 4500, date: null, utr: "" },
      prathamesh: { paid: false, amount: 4500, date: null, utr: "" }
    }
  },
  {
    id: "elec-sep-2026",
    title: "MSEDCL Electricity Bill",
    type: "electricity",
    totalAmount: 2850,
    perPersonAmount: 570,
    dueDay: 15,
    dueDate: "2026-09-15",
    monthYear: "Sep 2026",
    billArrivedDate: "2026-09-01",
    consumerNumber: "160221929401",
    recipientName: "Electricity Board (MSEDCL)",
    recipientUpi: "8010616851@upi", // Managed by Manas or directly
    splitMethod: "equal-5",
    payments: {
      manas: { paid: true, date: "2026-09-01T14:10:00.000Z", utr: "ELE9812" },
      rohan: { paid: false, date: null, utr: "" },
      shubham: { paid: false, date: null, utr: "" },
      ujwal: { paid: false, date: null, utr: "" },
      prathamesh: { paid: false, date: null, utr: "" }
    }
  },
  {
    id: "wm-sep-2026",
    title: "Washing Machine Bill",
    type: "washing-machine",
    totalAmount: 500,
    perPersonAmount: 100,
    dueDate: "2026-09-10",
    monthYear: "Sep 2026",
    recipientName: "Furlenco / Rentomojo",
    recipientUpi: "8237580043@upi",
    isCustomSplit: false,
    creatorId: "system",
    shares: { manas: 100, rohan: 100, shubham: 100, ujwal: 100, prathamesh: 100 },
    payments: {
      manas: { paid: false, amount: 100, date: null, utr: "" },
      rohan: { paid: true, amount: 100, date: "2026-09-01T16:00:00.000Z", utr: "WM891" },
      shubham: { paid: true, amount: 100, date: "2026-09-01T10:00:00.000Z", utr: "WM890" },
      ujwal: { paid: false, amount: 100, date: null, utr: "" },
      prathamesh: { paid: false, amount: 100, date: null, utr: "" }
    }
  }
];

export const INITIAL_MESSAGES = [
  {
    id: "msg-1",
    senderId: "manas",
    senderName: "Manas",
    category: "bills",
    text: "Electricity bill for August/September arrived: ₹2,850. Comes down to ₹570 each. Due date is 15th Sep.",
    timestamp: "2026-09-01T10:15:00.000Z",
    reactions: { thumbs: 3, energy: 2 }
  },
  {
    id: "msg-2",
    senderId: "rohan",
    senderName: "Rohan",
    category: "bills",
    text: "Rent for this month is due on 5th September. Don't forget to pay Ujwal and update here!",
    timestamp: "2026-09-01T11:45:00.000Z",
    reactions: { paid: 4 }
  },
  {
    id: "msg-3",
    senderId: "ujwal",
    senderName: "Ujwal",
    category: "chores",
    text: "Cleaned the attached bathroom and washed kitchen balcony mat yesterday. Next is Prathamesh!",
    timestamp: "2026-08-30T19:20:00.000Z",
    reactions: { sparkle: 4, thumbs: 2 }
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Electricity Bill Arrived",
    body: "Amount ₹2,850 (₹570 per person). Due date: 15 Sep 2026.",
    time: "Today, 10:15 AM",
    type: "bill",
    unread: true
  },
  {
    id: "notif-2",
    title: "Monthly Rent Due Soon",
    body: "Pay your rent share to Ujwal before 5th September.",
    time: "Today, 09:00 AM",
    type: "rent",
    unread: true
  },
  {
    id: "notif-3",
    title: "Cleaning Turn: Common Bathroom",
    body: "It is Rohan's turn to clean the Common Bathroom.",
    time: "Yesterday",
    type: "chore",
    unread: false
  }
];
