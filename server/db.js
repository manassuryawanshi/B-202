import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

const DEFAULT_MEMBERS = [
  {
    id: "rohan",
    name: "Rohan",
    phone: "8766688102",
    displayPhone: "87666 88102",
    room: "Living Hall",
    roomBadge: "Hall",
    roomType: "hall",
    upiId: "8766688102@upi",
    avatarColor: "#E0564C",
    initials: "RO",
    avatarEmoji: "",
    pin: "1234"
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
    avatarColor: "#E67E22",
    initials: "SH",
    avatarEmoji: "",
    pin: "1234"
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
    avatarColor: "#2B72EE",
    initials: "MA",
    avatarEmoji: "",
    pin: "1234"
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
    avatarColor: "#27AE60",
    initials: "UJ",
    avatarEmoji: "",
    pin: "1234"
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
    avatarColor: "#8E44AD",
    initials: "PR",
    avatarEmoji: "",
    pin: "1234"
  }
];

const DEFAULT_OWNER = {
  name: "Mr. Ajit Thakkar",
  title: "Flat Owner (B-202)",
  phone: "9822012345",
  displayPhone: "+91 98220 12345",
  upiId: "skyra.b202@okhdfcbank",
  monthlyRent: 27000,
  dueDay: 5,
  depositAmount: 100000,
  notes: "Monthly rent ₹27,000 strictly by 5th of each month. Share screenshot on WhatsApp.",
  whatsappLink: "https://wa.me/919822012345?text=Hi%20Ajit%20ji,%20Rent%20for%20B-202%20Skyra%20Residency%20is%20paid."
};

// Strict chore rules per user instructions:
// 1. Common Bathroom: only Manas, Rohan, Shubham
// 2. Attached Bathroom: only Prathamesh, Ujwal
// 3. Hall Balcony: only Rohan, Shubham
// 4. Common Balcony (between bedrooms): only Manas, Prathamesh, Ujwal
// 5. Kitchen Balcony: shared rotation
const DEFAULT_AREAS = [
  {
    id: "common-bath",
    name: "Common Bathroom",
    type: "Bathroom",
    location: "Hallway / Near Bed 1",
    usedBy: "Manas, Rohan & Shubham",
    suggestedCycle: "Every 4 days",
    rotationOrder: ["rohan", "shubham", "manas"],
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
    usedBy: "Prathamesh & Ujwal",
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
    usedBy: "Rohan & Shubham",
    suggestedCycle: "Weekly",
    rotationOrder: ["shubham", "rohan"],
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
    usedBy: "All Flatmates (Utility / Washing Machine)",
    suggestedCycle: "Weekly",
    rotationOrder: ["manas", "rohan", "shubham", "ujwal", "prathamesh"],
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
    usedBy: "Manas, Prathamesh & Ujwal",
    suggestedCycle: "Weekly",
    rotationOrder: ["prathamesh", "ujwal", "manas"],
    currentTurn: "prathamesh",
    nextTurn: "ujwal",
    lastCleaned: "2026-08-25T17:45:00.000Z",
    lastCleanedBy: "manas"
  }
];

// Bill Formulas per user instructions:
// 1. Rent: ₹27,000 total. Manas: ₹9,000. Others (Rohan, Shubham, Ujwal, Prathamesh): ₹4,500 each.
// 2. Washing Machine: ₹100 per person (₹500 total).
// 3. Electricity: Custom amounts per member.
// 4. WiFi: Removed completely.
const DEFAULT_BILLS = [
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
    shares: {
      manas: 9000,
      rohan: 4500,
      shubham: 4500,
      ujwal: 4500,
      prathamesh: 4500
    },
    payments: {
      manas: { paid: true, amount: 9000, date: "2026-09-01T12:00:00.000Z", utr: "UTR902188" },
      rohan: { paid: true, amount: 4500, date: "2026-09-01T15:30:00.000Z", utr: "UTR902189" },
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
    dueDate: "2026-09-15",
    monthYear: "Sep 2026",
    billArrivedDate: "2026-09-01",
    consumerNumber: "160221929401",
    recipientName: "Electricity Board (MSEDCL)",
    recipientUpi: "8010616851@upi",
    isCustomSplit: true,
    // Custom amounts configurable per member
    shares: {
      manas: 750,
      rohan: 500,
      shubham: 500,
      ujwal: 600,
      prathamesh: 500
    },
    payments: {
      manas: { paid: true, amount: 750, date: "2026-09-01T14:10:00.000Z", utr: "ELE9812" },
      rohan: { paid: false, amount: 500, date: null, utr: "" },
      shubham: { paid: false, amount: 500, date: null, utr: "" },
      ujwal: { paid: false, amount: 600, date: null, utr: "" },
      prathamesh: { paid: false, amount: 500, date: null, utr: "" }
    }
  },
  {
    id: "wm-sep-2026",
    title: "Washing Machine Rental",
    type: "washing-machine",
    totalAmount: 500,
    dueDate: "2026-09-10",
    monthYear: "Sep 2026",
    recipientName: "Furlenco / Rentomojo",
    recipientUpi: "8237580043@upi",
    isCustomSplit: false,
    perPersonAmount: 100,
    shares: {
      manas: 100,
      rohan: 100,
      shubham: 100,
      ujwal: 100,
      prathamesh: 100
    },
    payments: {
      manas: { paid: false, amount: 100, date: null, utr: "" },
      rohan: { paid: true, amount: 100, date: "2026-09-01T16:00:00.000Z", utr: "WM891" },
      shubham: { paid: true, amount: 100, date: "2026-09-01T10:00:00.000Z", utr: "WM890" },
      ujwal: { paid: false, amount: 100, date: null, utr: "" },
      prathamesh: { paid: false, amount: 100, date: null, utr: "" }
    }
  }
];

const DEFAULT_MESSAGES = [
  {
    id: "msg-1",
    senderId: "manas",
    senderName: "Manas",
    category: "bills",
    text: "Electricity bill arrived for August/September: ₹2,850 total. Check your custom share in the Bills tab!",
    timestamp: "2026-09-01T10:15:00.000Z",
    reactions: { thumbs: 3, energy: 2 }
  },
  {
    id: "msg-2",
    senderId: "rohan",
    senderName: "Rohan",
    category: "bills",
    text: "Rent for this month is ₹27,000 due on 5th September. Paid my ₹4,500 share to Sharma ji!",
    timestamp: "2026-09-01T11:45:00.000Z",
    reactions: { paid: 4 }
  },
  {
    id: "msg-3",
    senderId: "ujwal",
    senderName: "Ujwal",
    category: "chores",
    text: "Cleaned the attached bathroom and wiped down mirrors. Prathamesh is up next!",
    timestamp: "2026-09-01T16:20:00.000Z",
    reactions: { sparkle: 4, thumbs: 2 }
  }
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Electricity Bill Arrived",
    body: "Amount ₹2,850 total. Individual amounts set for this month.",
    time: "Today, 10:15 AM",
    type: "bill",
    unread: true
  },
  {
    id: "notif-2",
    title: "Monthly Rent Due Soon",
    body: "Total ₹27,000 for Flat B-202. Due 5th Sep.",
    time: "Today, 09:00 AM",
    type: "rent",
    unread: true
  },
  {
    id: "notif-3",
    title: "Cleaning Turn: Common Bathroom",
    body: "Rohan's turn for Common Bathroom today.",
    time: "Yesterday",
    type: "chore",
    unread: false
  }
];

export function getDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      members: DEFAULT_MEMBERS,
      owner: DEFAULT_OWNER,
      areas: DEFAULT_AREAS,
      bills: DEFAULT_BILLS,
      choreHistory: [
        {
          id: "chore-1",
          areaId: "attached-bath",
          areaName: "Attached Bathroom",
          cleanedBy: "prathamesh",
          cleanedByName: "Prathamesh",
          date: "2026-08-29T18:00:00.000Z",
          notes: "Deep cleaned shower and floor tiles."
        },
        {
          id: "chore-2",
          areaId: "common-bath",
          areaName: "Common Bathroom",
          cleanedBy: "manas",
          cleanedByName: "Manas",
          date: "2026-08-28T14:30:00.000Z",
          notes: "Scrubbed basin and mopped tiles."
        },
        {
          id: "chore-3",
          areaId: "hall-balcony",
          areaName: "Hall Balcony",
          cleanedBy: "rohan",
          cleanedByName: "Rohan",
          date: "2026-08-26T11:00:00.000Z",
          notes: "Swept leaves and washed floor."
        }
      ],
      messages: DEFAULT_MESSAGES,
      notifications: DEFAULT_NOTIFICATIONS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database file:', err);
    return null;
  }
}

export function saveDatabase(data) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}
