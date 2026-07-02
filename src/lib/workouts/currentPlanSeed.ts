export type WorkoutDayCode = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type WorkoutPlanSeed = {
  seedKey: string;
  name: string;
  version: number;
  goalContext: {
    primaryGoal: string;
    secondaryGoals: string[];
  };
  days: WorkoutDaySeed[];
};

export type WorkoutDaySeed = {
  seedKey: string;
  dayOfWeek: WorkoutDayCode;
  dayOrder: number;
  title: string;
  category: string;
  capText: string | null;
  notes?: string | null;
  blocks: WorkoutBlockSeed[];
};

export type WorkoutBlockSeed = {
  seedKey: string;
  title: string;
  blockType: string;
  notes?: string | null;
  exercises: WorkoutExerciseSeed[];
};

export type WorkoutExerciseSeed = {
  seedKey: string;
  name: string;
  plannedSets?: string | null;
  plannedReps?: string | null;
  plannedDuration?: string | null;
  plannedRest?: string | null;
  plannedTempo?: string | null;
  plannedVariation?: string | null;
  notes?: string | null;
};

export const CURRENT_WORKOUT_PLAN_SEED: WorkoutPlanSeed = {
  seedKey: "current-workout-plan",
  name: "Current Workout Plan",
  version: 1,
  goalContext: {
    primaryGoal: "planche",
    secondaryGoals: [
      "front lever",
      "front lever pull-up",
      "90-degree push-up",
      "maintain running/cardio",
    ],
  },
  days: [
    {
      seedKey: "mon-push-a",
      dayOfWeek: "MON",
      dayOrder: 1,
      title: "Push A: Hard Planche + 90-degree Negatives",
      category: "push",
      capText: "70-75 min",
      blocks: [
        {
          seedKey: "mon-warm-up",
          title: "Warm-up",
          blockType: "warm-up",
          notes: "10-12 min. Wrists, shoulders, scap push-ups, hollow body, light planche leans.",
          exercises: [],
        },
        {
          seedKey: "mon-main",
          title: "Main work",
          blockType: "main",
          exercises: [
            {
              seedKey: "mon-advanced-tuck-planche-touch-holds",
              name: "Advanced tuck planche touch holds",
              plannedSets: "2",
              plannedDuration: "3-5s",
              plannedRest: "3 min",
            },
            {
              seedKey: "mon-tuck-planche-holds",
              name: "Tuck planche holds",
              plannedSets: "4",
              plannedDuration: "6-10s",
              plannedRest: "2:30-3 min",
              notes: "Reduced from 5 sets because there is now more weekly planche frequency.",
            },
            {
              seedKey: "mon-planche-leans",
              name: "Planche leans",
              plannedSets: "3",
              plannedDuration: "15-25s",
              plannedRest: "90-120s",
            },
            {
              seedKey: "mon-pseudo-planche-push-ups",
              name: "Pseudo planche push-ups",
              plannedSets: "3",
              plannedReps: "4-8",
              plannedRest: "2:30-3 min",
            },
            {
              seedKey: "mon-90-degree-push-up-negatives",
              name: "90-degree push-up negatives",
              plannedSets: "3",
              plannedReps: "2-3",
              plannedTempo: "4-6s down",
              plannedRest: "3 min",
              notes: "Keep these very clean. Do not turn them into ugly shoulder survival reps.",
            },
            {
              seedKey: "mon-compression-hollow-hold",
              name: "Compression / hollow hold",
              plannedSets: "2-3",
              plannedRest: "60-90s",
            },
          ],
        },
        {
          seedKey: "mon-optional-fl-micro",
          title: "Optional FL micro",
          blockType: "optional micro",
          notes:
            "5-6 min only. Only if elbows/shoulders feel good. This is not a workout, just technical exposure.",
          exercises: [
            {
              seedKey: "mon-easy-tuck-fl-hold",
              name: "Easy tuck FL hold",
              plannedSets: "2",
              plannedDuration: "8-10s",
            },
            {
              seedKey: "mon-scap-pull-up-or-depression",
              name: "Scap pull-up or scap depression hold",
              plannedSets: "2",
              plannedReps: "6-10",
            },
          ],
        },
      ],
    },
    {
      seedKey: "tue-track-fl-micro",
      dayOfWeek: "TUE",
      dayOrder: 2,
      title: "Track + Light Front Lever Micro",
      category: "cardio",
      capText: "Cardio day",
      notes:
        "Rotate weekly: A) 4x4 hard with 3 min jog rest; B) 6x800m with 2:00-2:30 rest; C) 12x200m with 200m jog rest.",
      blocks: [
        {
          seedKey: "tue-track",
          title: "Track",
          blockType: "cardio",
          notes: "Choose the current weekly rotation.",
          exercises: [
            {
              seedKey: "tue-track-session",
              name: "Track intervals",
              plannedVariation: "4x4 hard / 6x800m / 12x200m",
              plannedRest: "Rotation-dependent",
            },
          ],
        },
        {
          seedKey: "tue-fl-micro",
          title: "Light front lever micro",
          blockType: "micro",
          notes: "Keep this light. Tuesday should not compromise Wednesday's hard front lever day.",
          exercises: [
            {
              seedKey: "tue-easy-fl-holds",
              name: "Easy tuck / one-leg FL holds",
              plannedSets: "3",
              plannedDuration: "8-12s",
              plannedRest: "90s",
            },
            {
              seedKey: "tue-scap-pull-ups",
              name: "Scap pull-ups",
              plannedSets: "2",
              plannedReps: "8-12",
              plannedRest: "60-90s",
            },
          ],
        },
      ],
    },
    {
      seedKey: "wed-pull-a",
      dayOfWeek: "WED",
      dayOrder: 3,
      title: "Pull A: Hard Front Lever",
      category: "pull",
      capText: "70-75 min",
      blocks: [
        {
          seedKey: "wed-warm-up",
          title: "Warm-up",
          blockType: "warm-up",
          notes:
            "10-12 min. Dead hangs, scap pull-ups, band pulldowns, hollow body, easy tuck FL holds.",
          exercises: [],
        },
        {
          seedKey: "wed-main",
          title: "Main work",
          blockType: "main",
          exercises: [
            {
              seedKey: "wed-harder-fl-primer-holds",
              name: "Harder FL primer holds",
              plannedSets: "2",
              plannedDuration: "3-5s",
              plannedRest: "3 min",
            },
            {
              seedKey: "wed-main-fl-holds",
              name: "Main FL holds",
              plannedSets: "5",
              plannedDuration: "6-10s",
              plannedRest: "3 min",
            },
            {
              seedKey: "wed-fl-raises-or-negatives",
              name: "FL raises or FL negatives",
              plannedSets: "3",
              plannedReps: "3-5",
              plannedRest: "2:30-3 min",
              notes: "Reduced from 4 sets because Saturday also starts with front lever strength.",
            },
            {
              seedKey: "wed-weighted-pull-ups",
              name: "Weighted pull-ups",
              plannedSets: "3-4",
              plannedReps: "3-5",
              plannedRest: "3 min",
              notes: "Do 4 sets only if the FL work was crisp.",
            },
            {
              seedKey: "wed-rows",
              name: "Rows",
              plannedSets: "3",
              plannedReps: "6-10",
              plannedRest: "2 min",
            },
            {
              seedKey: "wed-hanging-leg-raises",
              name: "Hanging leg raises / toes-to-bar",
              plannedSets: "2-3",
              plannedReps: "6-10",
              plannedRest: "90s",
            },
          ],
        },
        {
          seedKey: "wed-planche-micro",
          title: "Planche micro",
          blockType: "micro",
          notes:
            "5-7 min. No tuck planche here. Just scapular protraction, wrist tolerance, and straight-arm pushing pattern.",
          exercises: [
            {
              seedKey: "wed-easy-planche-lean",
              name: "Easy planche lean",
              plannedSets: "2",
              plannedDuration: "15-20s",
            },
            {
              seedKey: "wed-protraction-plank-hold",
              name: "Protraction plank hold",
              plannedSets: "2",
              plannedDuration: "20-30s",
            },
          ],
        },
      ],
    },
    {
      seedKey: "thu-legs-planche-run",
      dayOfWeek: "THU",
      dayOrder: 4,
      title: "Legs + Light Planche + Easy Run",
      category: "legs",
      capText: "Legs + micro 60-70 min; run separate 30-45 min Zone 2",
      blocks: [
        {
          seedKey: "thu-warm-up",
          title: "Warm-up",
          blockType: "warm-up",
          notes: "8-10 min. Ankles, hips, light jumps, bodyweight split squats, RDL patterning.",
          exercises: [],
        },
        {
          seedKey: "thu-legs",
          title: "Legs",
          blockType: "main",
          exercises: [
            {
              seedKey: "thu-box-jumps",
              name: "Box jumps",
              plannedSets: "5",
              plannedReps: "3",
              plannedRest: "90-120s",
            },
            {
              seedKey: "thu-bulgarian-split-squat",
              name: "Bulgarian split squat",
              plannedSets: "3",
              plannedReps: "6-10/leg",
              plannedRest: "2:00-2:30",
            },
            {
              seedKey: "thu-db-rdl",
              name: "DB RDL / single-leg RDL",
              plannedSets: "3",
              plannedReps: "8-12",
              plannedRest: "2 min",
            },
            {
              seedKey: "thu-calves",
              name: "Calves",
              plannedSets: "3",
              plannedReps: "10-15",
              plannedRest: "60-90s",
            },
            {
              seedKey: "thu-tibialis",
              name: "Tibialis",
              plannedSets: "2-3",
              plannedReps: "15-25",
              plannedRest: "60s",
            },
          ],
        },
        {
          seedKey: "thu-light-planche-micro",
          title: "Light planche micro",
          blockType: "micro",
          notes: "6-8 min.",
          exercises: [
            {
              seedKey: "thu-planche-leans",
              name: "Planche leans",
              plannedSets: "3",
              plannedDuration: "15-20s",
            },
            {
              seedKey: "thu-protraction-plank-hold",
              name: "Protraction plank hold",
              plannedSets: "2",
              plannedDuration: "20-30s",
            },
          ],
        },
        {
          seedKey: "thu-easy-run",
          title: "Easy run",
          blockType: "cardio",
          exercises: [
            {
              seedKey: "thu-zone-2-run",
              name: "Zone 2 run",
              plannedDuration: "30-45 min",
              notes: "Only go 60 min if Friday still feels sharp.",
            },
          ],
        },
      ],
    },
    {
      seedKey: "fri-push-b",
      dayOfWeek: "FRI",
      dayOrder: 5,
      title: "Push B: Planche Volume + 90-degree Assisted",
      category: "push",
      capText: "70-75 min",
      blocks: [
        {
          seedKey: "fri-warm-up",
          title: "Warm-up",
          blockType: "warm-up",
          notes:
            "10-12 min. Wrists, scap push-ups, wall handstand line, planche leans, light dips.",
          exercises: [],
        },
        {
          seedKey: "fri-main",
          title: "Main work",
          blockType: "main",
          notes:
            "Superset face pulls and external rotations to save time. No extra front lever micro here.",
          exercises: [
            {
              seedKey: "fri-tuck-planche-holds",
              name: "Tuck planche holds",
              plannedSets: "5",
              plannedDuration: "6-10s",
              plannedRest: "2:30-3 min",
              notes:
                "Reduced from 6 sets because Monday is already hard and Wednesday/Thursday include micros.",
            },
            {
              seedKey: "fri-hspu",
              name: "HSPU / parallette HSPU",
              plannedSets: "4",
              plannedReps: "1-4",
              plannedRest: "3 min",
            },
            {
              seedKey: "fri-90-degree-assisted",
              name: "90-degree assisted reps / partials",
              plannedSets: "4",
              plannedReps: "2-4",
              plannedRest: "2:30-3 min",
            },
            {
              seedKey: "fri-ring-triceps-or-dips",
              name: "Ring triceps extensions or dips",
              plannedSets: "3",
              plannedReps: "6-10",
              plannedRest: "2 min",
            },
            {
              seedKey: "fri-face-pulls",
              name: "Face pulls",
              plannedSets: "2",
              plannedReps: "15-20",
            },
            {
              seedKey: "fri-band-external-rotations",
              name: "Band external rotations",
              plannedSets: "2",
              plannedReps: "15",
            },
          ],
        },
      ],
    },
    {
      seedKey: "sat-pull-b",
      dayOfWeek: "SAT",
      dayOrder: 6,
      title: "Pull B: Front Lever Priority + Rings",
      category: "pull",
      capText: "70-75 min",
      notes: "Front lever is the priority, so it goes first.",
      blocks: [
        {
          seedKey: "sat-warm-up",
          title: "Warm-up",
          blockType: "warm-up",
          notes:
            "10-12 min. Dead hangs, scap pull-ups, false grip prep, hollow body, easy FL holds.",
          exercises: [],
        },
        {
          seedKey: "sat-main",
          title: "Main work",
          blockType: "main",
          exercises: [
            {
              seedKey: "sat-fl-pull-up-progression",
              name: "Front lever pull-up progression",
              plannedSets: "5",
              plannedReps: "1-3",
              plannedRest: "3 min",
              notes: "This is now the priority movement.",
            },
            {
              seedKey: "sat-fl-raises-negatives",
              name: "FL raises / negatives",
              plannedSets: "3",
              plannedReps: "3-5",
              plannedRest: "2:30-3 min",
              notes: "Reduced from 4 sets because Wednesday already includes hard FL.",
            },
            {
              seedKey: "sat-muscle-up-progression",
              name: "Muscle-up progression",
              plannedSets: "4-5",
              plannedReps: "1-3",
              plannedRest: "2:30-3 min",
              notes: "Still trained, just not before the main goal.",
            },
            {
              seedKey: "sat-ring-pull-ups",
              name: "Ring pull-ups / chin-ups",
              plannedSets: "3",
              plannedReps: "5-8",
              plannedRest: "2 min",
            },
            {
              seedKey: "sat-ring-dips",
              name: "Ring dips",
              plannedSets: "2-3",
              plannedReps: "5-8",
              plannedRest: "2 min",
            },
            {
              seedKey: "sat-pelican-curls",
              name: "Pelican curl progression / ring curls",
              plannedSets: "2",
              plannedReps: "6-10",
              plannedRest: "90s",
              notes:
                "If elbows feel cooked after FL pull-up progressions, skip pelican curls that day.",
            },
          ],
        },
      ],
    },
    {
      seedKey: "sun-long-run-prehab",
      dayOfWeek: "SUN",
      dayOrder: 7,
      title: "Long Run + Optional Prehab",
      category: "cardio",
      capText: "Cardio day",
      notes: "No real planche or front lever work on Sunday. Let connective tissue recover.",
      blocks: [
        {
          seedKey: "sun-long-run",
          title: "Long run",
          blockType: "cardio",
          exercises: [
            {
              seedKey: "sun-zone-2-long-run",
              name: "Long run",
              plannedDuration: "60-90 min easy Zone 2",
            },
          ],
        },
        {
          seedKey: "sun-optional-prehab",
          title: "Optional prehab",
          blockType: "prehab",
          exercises: [
            { seedKey: "sun-tibialis", name: "Tibialis", plannedSets: "2", plannedReps: "20-30" },
            { seedKey: "sun-calves", name: "Calves", plannedSets: "2", plannedReps: "15-20" },
            { seedKey: "sun-face-pulls", name: "Face pulls", plannedSets: "2", plannedReps: "15" },
            {
              seedKey: "sun-wrist-extensor-eccentrics",
              name: "Wrist extensor eccentrics",
              plannedSets: "2",
              plannedReps: "15",
            },
          ],
        },
      ],
    },
  ],
};
