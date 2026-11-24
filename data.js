// Sample student profiles and doubts for Campus Doubt Bounty Board

const SAMPLE_STUDENTS = [
  {
    id: 1,
    name: "Aarav Sharma",
    branch: "CSE, 2nd year",
    skills: ["Python", "Pandas", "DSA", "C++"],
    rating: 4.8,
    sessions: 14,
    points: 340,
    allTimeSolved: 42,
    monthSolved: 18,
    solveOffsets: {
      0: 3, "-1": 2, "-2": 4, "-3": 1, "-4": 0,
      "-5": 2, "-6": 3, "-7": 2, "-8": 1, "-9": 0,
      "-10": 1, "-11": 3, "-12": 2, "-13": 0, "-14": 4,
      "-15": 1, "-16": 2, "-17": 0, "-18": 3, "-19": 1,
      "-20": 2, "-21": 0, "-22": 1, "-23": 2, "-24": 3,
      "-25": 0, "-26": 2, "-27": 1
    }
  },
  {
    id: 2,
    name: "Priya Verma",
    branch: "Mech, 3rd year",
    skills: ["SolidWorks", "CAD", "Thermodynamics", "AutoCAD"],
    rating: 4.9,
    sessions: 11,
    points: 310,
    allTimeSolved: 36,
    monthSolved: 15,
    solveOffsets: {
      0: 2, "-1": 1, "-2": 3, "-3": 2, "-4": 1, "-5": 2, "-6": 0,
      "-7": 1, "-8": 2, "-9": 0, "-10": 3, "-11": 1, "-12": 2
    }
  },
  {
    id: 3,
    name: "Rohan Gupta",
    branch: "CSE, 3rd year",
    skills: ["React", "JavaScript", "Node.js", "MongoDB"],
    rating: 4.6,
    sessions: 9,
    points: 250,
    allTimeSolved: 25,
    monthSolved: 8,
    // 0 solved today -> Streak ended!
    solveOffsets: {
      0: 0, "-1": 2, "-2": 1, "-3": 0, "-4": 3, "-5": 1, "-6": 0,
      "-7": 2, "-8": 0, "-9": 1, "-10": 2
    }
  },
  {
    id: 4,
    name: "Sneha Patil",
    branch: "ECE, 2nd year",
    skills: ["Arduino", "Embedded C", "Circuit Analysis", "MATLAB"],
    rating: 4.7,
    sessions: 8,
    points: 220,
    allTimeSolved: 22,
    monthSolved: 9,
    solveOffsets: {
      0: 1, "-1": 2, "-2": 0, "-3": 1, "-4": 1, "-5": 0, "-6": 2
    }
  },
  {
    id: 5,
    name: "Kabir Singh",
    branch: "Civil, 3rd year",
    skills: ["AutoCAD", "Structural Analysis", "STAAD Pro"],
    rating: 4.4,
    sessions: 5,
    points: 140,
    allTimeSolved: 14,
    monthSolved: 5,
    solveOffsets: {
      0: 1, "-1": 1, "-2": 0, "-3": 2, "-4": 0, "-5": 1
    }
  },
  {
    id: 6,
    name: "Ananya Iyer",
    branch: "CSE, 4th year",
    skills: ["Machine Learning", "Python", "SQL", "DSA"],
    rating: 4.9,
    sessions: 17,
    points: 420,
    allTimeSolved: 58,
    monthSolved: 24,
    solveOffsets: {
      0: 4, "-1": 3, "-2": 2, "-3": 4, "-4": 1, "-5": 3, "-6": 2, "-7": 0,
      "-8": 2, "-9": 3, "-10": 1, "-11": 0, "-12": 4
    }
  },
  {
    id: 7,
    name: "Vikram Rao",
    branch: "Design, 2nd year",
    skills: ["Figma", "UI/UX", "Photoshop", "Illustrator"],
    rating: 4.5,
    sessions: 6,
    points: 160,
    allTimeSolved: 16,
    monthSolved: 6,
    solveOffsets: {
      0: 0, "-1": 1, "-2": 2, "-3": 0, "-4": 1
    }
  },
  {
    id: 8,
    name: "Meera Nair",
    branch: "Maths, 3rd year",
    skills: ["Calculus", "Linear Algebra", "Probability", "MATLAB"],
    rating: 4.8,
    sessions: 10,
    points: 270,
    allTimeSolved: 31,
    monthSolved: 12,
    solveOffsets: {
      0: 2, "-1": 3, "-2": 1, "-3": 0, "-4": 2, "-5": 1
    }
  },
  {
    id: 9,
    name: "Arjun Mehta",
    branch: "EEE, 2nd year",
    skills: ["Circuit Analysis", "Power Systems", "MATLAB", "Simulink"],
    rating: 4.3,
    sessions: 4,
    points: 90,
    allTimeSolved: 11,
    monthSolved: 4,
    solveOffsets: {
      0: 0, "-1": 1, "-2": 0, "-3": 0, "-4": 1
    }
  },
  {
    id: 10,
    name: "Isha Kapoor",
    branch: "CSE, 2nd year",
    skills: ["Java", "OOP", "DBMS", "SQL"],
    rating: 4.6,
    sessions: 7,
    points: 180,
    allTimeSolved: 19,
    monthSolved: 7,
    solveOffsets: {
      0: 1, "-1": 1, "-2": 2, "-3": 0, "-4": 1
    }
  }
];

// Sample doubts covering every stage:
// 'open', 'proposed' (handshake pending), 'claimed' (in session / solution review), 'resolved' (archived into Knowledge Vault)
const SAMPLE_DOUBTS = [
  {
    id: 1,
    title: "Segmentation fault in C++ linked list deletion",
    description: "My delete-node function crashes with a segfault when deleting the head node. Using a singly linked list with raw pointers in my DSA assignment.",
    tags: ["C++", "DSA"],
    department: "CSE",
    urgency: "high",
    bounty: 30,
    status: "open",
    postedBy: 9,
    claimedBy: null,
    postedMinAgo: 12,
    images: [],
    proposal: null,
    scheduledTime: null,
    helpMode: null,
    solution: null,
    upvotes: 4
  },
  {
    id: 2,
    title: "SolidWorks sketch shows 'under-defined' and won't extrude",
    description: "Sketch stays blue even after adding all dimensions. Need help finding the missing concentric constraint before lab submission.",
    tags: ["SolidWorks", "CAD"],
    department: "Mech",
    urgency: "medium",
    bounty: 20,
    status: "proposed",
    postedBy: 5,
    claimedBy: null,
    postedMinAgo: 35,
    images: [],
    proposal: {
      helperId: 2, // Priya Verma offered to help
      helpMode: "written",
      proposedTime: "In 15 minutes",
      note: "I had this exact sketch issue yesterday—usually it's a hidden tangent arc constraint. I can write down the step-by-step fix with photos.",
      proposedAtMinAgo: 5
    },
    scheduledTime: null,
    solution: null,
    upvotes: 6
  },
  {
    id: 3,
    title: "Exam tomorrow: entropy change in irreversible processes",
    description: "I can't figure out how to calculate entropy change for an irreversible adiabatic expansion. Need a quick walkthrough or formula notes.",
    tags: ["Thermodynamics"],
    department: "Mech",
    urgency: "exam",
    bounty: 35,
    status: "open",
    postedBy: 4,
    claimedBy: null,
    postedMinAgo: 55,
    images: [],
    proposal: null,
    scheduledTime: null,
    helpMode: null,
    solution: null,
    upvotes: 11
  },
  {
    id: 4,
    title: "Pandas merge is giving duplicate rows",
    description: "After merging two dataframes on student_id I get 3x rows. Not sure if it's a many-to-many relationship issue.",
    tags: ["Python", "Pandas"],
    department: "CSE",
    urgency: "medium",
    bounty: 15,
    status: "open",
    postedBy: 10,
    claimedBy: null,
    postedMinAgo: 50,
    images: [],
    proposal: null,
    scheduledTime: null,
    helpMode: null,
    solution: null,
    upvotes: 3
  },
  {
    id: 5,
    title: "React useEffect running in an infinite re-render loop",
    description: "I'm fetching data inside useEffect and updating state, but the component keeps re-rendering endlessly. Dependency array is confusing me.",
    tags: ["React", "JavaScript"],
    department: "CSE",
    urgency: "high",
    bounty: 25,
    status: "claimed",
    postedBy: 4,
    claimedBy: 3, // Rohan Gupta
    postedMinAgo: 60,
    claimedMinAgo: 20,
    images: [],
    scheduledTime: "Right Now",
    helpMode: "written",
    meetLink: "https://meet.jit.si/CampusDoubt-5-react-session",
    solution: {
      by: 3,
      submittedAtMinAgo: 5,
      text: "The issue is that you are creating an object/array inside the component body and passing it to the dependency array. Since objects are compared by reference in JavaScript, every render creates a new reference which triggers `useEffect` again in an infinite loop.\n\nFix:\n1. Move the function or object INSIDE the useEffect.\n2. Or use `useCallback` / memoize the parameter.\n3. Check the dependency array to only include primitive values like `id`.",
      images: []
    },
    upvotes: 8
  },
  {
    id: 6,
    title: "SQL JOIN vs Correlated Subquery performance",
    description: "My DBMS assignment requires comparing query execution plans of JOIN vs subquery on an indexed table.",
    tags: ["SQL", "DBMS"],
    department: "CSE",
    urgency: "medium",
    bounty: 20,
    status: "claimed",
    postedBy: 3,
    claimedBy: 10,
    postedMinAgo: 40,
    claimedMinAgo: 6,
    images: [],
    scheduledTime: "Right Now",
    helpMode: "chat",
    meetLink: "https://meet.jit.si/CampusDoubt-6-dbms-session",
    solution: null,
    upvotes: 5
  },
  // --- VERIFIED CAMPUS KNOWLEDGE VAULT ARCHIVES ---
  {
    id: 7,
    title: "STAAD Pro load combination error IS 456 syntax",
    description: "Getting error 'Undefined load case in combination' when applying IS 456 dead + live combinations in frame analysis.",
    tags: ["STAAD Pro", "Structural Analysis"],
    department: "Civil",
    urgency: "high",
    bounty: 25,
    status: "resolved",
    postedBy: 2,
    claimedBy: 5,
    postedMinAgo: 600,
    claimedMinAgo: 300,
    resolvedMinAgo: 288,
    rating: 5,
    feedback: "Saved my lab submission, explained the sequential order perfectly!",
    scheduledTime: "Completed",
    helpMode: "written",
    meetLink: null,
    solution: {
      by: 5,
      submittedAtMinAgo: 290,
      text: "In STAAD.Pro input file, command sequence is strictly chronological. Load combinations MUST appear AFTER both primary load cases (1: DL, 2: LL) are fully defined and populated.\n\nCorrect Syntax:\nLOAD 1 LOADTYPE Dead TITLE DEAD LOAD\nSELFWEIGHT Y -1\nLOAD 2 LOADTYPE Live TITLE LIVE LOAD\n...\nLOAD COMB 101 1.5 DL + 1.5 LL\n1 1.5 2 1.5",
      images: []
    },
    upvotes: 28
  },
  {
    id: 8,
    title: "ML Model validation accuracy stuck at 62% (Severe Overfitting)",
    description: "Training accuracy is 99% but test accuracy flatlines at 62%. Overfitting badly on CIFAR-10 subset.",
    tags: ["Machine Learning", "Python"],
    department: "CSE",
    urgency: "medium",
    bounty: 30,
    status: "resolved",
    postedBy: 3,
    claimedBy: 6,
    postedMinAgo: 1600,
    claimedMinAgo: 1500,
    resolvedMinAgo: 1486,
    rating: 5,
    feedback: "Ananya's dropout + L2 regularization suggestion got my test accuracy to 84%!",
    scheduledTime: "Completed",
    helpMode: "written",
    meetLink: null,
    solution: {
      by: 6,
      submittedAtMinAgo: 1490,
      text: "Diagnosed deep model overfitting with no regularization.\n\nResolution Steps:\n1. Added `Dropout(0.35)` after Conv2D blocks.\n2. Injected L2 Weight Decay (`weight_decay=1e-4`) in Adam optimizer.\n3. Applied basic Data Augmentation (RandomHorizontalFlip, RandomRotation(10)).\n4. Implemented EarlyStopping on `val_loss` with patience=5.",
      images: []
    },
    upvotes: 34
  },
  {
    id: 9,
    title: "Fast Fourier Transform implementation in NumPy giving NaN values",
    description: "My NumPy FFT script was returning NaN on audio frequencies due to divide by zero in log-power normalization.",
    tags: ["Python", "MATLAB"],
    department: "Maths",
    urgency: "high",
    bounty: 35,
    status: "resolved",
    postedBy: 1, // Asked by Aarav Sharma
    claimedBy: 8, // Solved by Meera Nair
    postedMinAgo: 1200,
    claimedMinAgo: 1100,
    resolvedMinAgo: 1085,
    rating: 5,
    feedback: "Meera spotted the zero division in the frequency bin denominator immediately. Great math breakdown!",
    scheduledTime: "Completed",
    helpMode: "written",
    meetLink: null,
    solution: {
      by: 8,
      submittedAtMinAgo: 1090,
      text: "The DC component at index 0 has frequency = 0 Hz. When calculating normalized magnitude `log10(X / freq)`, line 42 divides by zero producing NaN.\n\nFix:\nAdd a numerical stabilizer epsilon (1e-9):\n`normalized = np.log10(np.abs(fft_vals) / (freqs + 1e-9))`\nOr slice from index 1: `freqs[1:]`.",
      images: []
    },
    upvotes: 19
  },
  {
    id: 10,
    title: "Figma component variant states not inheriting auto-layout padding",
    description: "Hover state button width kept collapsing when placed inside navigation bar.",
    tags: ["Figma", "UI/UX"],
    department: "Design",
    urgency: "medium",
    bounty: 20,
    status: "resolved",
    postedBy: 1, // Asked by Aarav Sharma
    claimedBy: 7, // Solved by Vikram Rao
    postedMinAgo: 2400,
    claimedMinAgo: 2200,
    resolvedMinAgo: 2180,
    rating: 4,
    feedback: "Super quick Figma auto-layout fix. Button hugs contents now across all variants.",
    scheduledTime: "Completed",
    helpMode: "written",
    meetLink: null,
    solution: {
      by: 7,
      submittedAtMinAgo: 2190,
      text: "Set parent frame to 'Hug Contents' and ensure both Default and Hover variants have identical auto-layout constraints set to 'Fill container'. Check that independent padding isn't zeroed on hover state.",
      images: []
    },
    upvotes: 14
  },
  {
    id: 11,
    title: "Arduino HC-SR04 Ultrasonic Sensor always reads 0 cm",
    description: "Connected to digital pins 9 and 10 on Uno. Serial monitor prints 0 cm constantly.",
    tags: ["Arduino", "Embedded C"],
    department: "ECE",
    urgency: "medium",
    bounty: 20,
    status: "resolved",
    postedBy: 9,
    claimedBy: 4, // Sneha Patil
    postedMinAgo: 3200,
    claimedMinAgo: 3000,
    resolvedMinAgo: 2980,
    rating: 5,
    feedback: "Trigger pulse timing was missing the 10 microsecond delay! Working now.",
    scheduledTime: "Completed",
    helpMode: "written",
    meetLink: null,
    solution: {
      by: 4,
      submittedAtMinAgo: 2985,
      text: "HC-SR04 requires a clean 10 microsecond HIGH pulse to trigger sonar burst.\n\nFix:\n```cpp\ndigitalWrite(trigPin, LOW);\ndelayMicroseconds(2);\ndigitalWrite(trigPin, HIGH);\ndelayMicroseconds(10);\ndigitalWrite(trigPin, LOW);\nlong duration = pulseIn(echoPin, HIGH);\nlong cm = duration * 0.034 / 2;\n```",
      images: []
    },
    upvotes: 22
  }
];

const SAMPLE_MESSAGES = {
  5: [
    { by: 4, text: "Hey Rohan, thanks for offering to help! I pasted the component code above.", minAgo: 18 },
    { by: 3, text: "Got it! I see the issue immediately. Writing down the exact fix and attaching steps for you right now.", minAgo: 12 },
    { by: 4, text: "Awesome, please send the solution whenever ready!", minAgo: 8 }
  ],
  6: [
    { by: 3,  text: "Hey Isha! Thanks for connecting. Is a JOIN always faster than a subquery?", minAgo: 5 },
    { by: 10, text: "Hey Rohan! Usually yes—a JOIN lets PostgreSQL/MySQL optimize indexes with hash or merge joins, whereas correlated subqueries can evaluate row-by-row.", minAgo: 4 },
    { by: 3,  text: "That makes total sense. Could we quickly review the EXPLAIN ANALYZE output?", minAgo: 2 },
    { by: 10, text: "Sure! We can chat here or hop on the optional video room if you want to share your screen.", minAgo: 1 }
  ],
  7: [
    { by: 2, text: "The 1.5 DL + 1.5 LL combination throws an error in STAAD.", minAgo: 296 },
    { by: 5, text: "Check that both primary load cases are declared BEFORE the combination command. STAAD evaluates strictly sequentially.", minAgo: 293 },
    { by: 2, text: "That was exactly it! Reordering the syntax solved it immediately.", minAgo: 289 }
  ],
  8: [
    { by: 3, text: "Which regularization should I apply first?", minAgo: 1496 },
    { by: 6, text: "Start with Dropout (0.3) after dense layers and Weight Decay (L2 = 1e-4), then monitor validation loss.", minAgo: 1491 }
  ],
  9: [
    { by: 1, text: "Getting NaN on line 42 when calculating FFT spectrum.", minAgo: 1098 },
    { by: 8, text: "Check line 42: you're dividing by `freqs[0]` which is 0 Hz. Add `+ 1e-9`.", minAgo: 1092 },
    { by: 1, text: "Fixed! You're a lifesaver Meera.", minAgo: 1086 }
  ],
  10: [
    { by: 1, text: "Button collapses width in navbar on hover variant.", minAgo: 2195 },
    { by: 7, text: "Make sure both master variants share 'Hug contents' horizontal resizing.", minAgo: 2185 }
  ],
  11: [
    { by: 9, text: "Sensor reads 0 cm constantly.", minAgo: 2995 },
    { by: 4, text: "Ensure pin 9 trigger is held HIGH for at least 10 microseconds before calling pulseIn.", minAgo: 2988 }
  ]
};
