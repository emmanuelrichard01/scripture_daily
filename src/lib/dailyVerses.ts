export interface DailyVerseItem {
  reference: string;
  text: string;
  theme?: string;
}

export const DAILY_VERSES: readonly DailyVerseItem[] = [
  {
    reference: "Psalm 119:105",
    text: "Your word is a lamp to my feet and a light to my path.",
    theme: "Guidance",
  },
  {
    reference: "Joshua 1:8",
    text: "This Book of the Law shall not depart from your mouth, but you shall meditate on it day and night, so that you may be careful to do according to all that is written in it.",
    theme: "Faithfulness",
  },
  {
    reference: "2 Timothy 3:16-17",
    text: "All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness.",
    theme: "Truth",
  },
  {
    reference: "Hebrews 4:12",
    text: "For the word of God is living and active, sharper than any two-edged sword, piercing to the division of soul and of spirit.",
    theme: "Power",
  },
  {
    reference: "Isaiah 40:8",
    text: "The grass withers, the flower fades, but the word of our God will stand forever.",
    theme: "Eternal",
  },
  {
    reference: "Romans 10:17",
    text: "So faith comes from hearing, and hearing through the word of Christ.",
    theme: "Faith",
  },
  {
    reference: "Matthew 4:4",
    text: "Man shall not live by bread alone, but by every word that comes from the mouth of God.",
    theme: "Sustenance",
  },
  {
    reference: "Psalm 1:2-3",
    text: "His delight is in the law of the LORD, and on his law he meditates day and night. He is like a tree planted by streams of water.",
    theme: "Flourishing",
  },
  {
    reference: "Proverbs 3:5-6",
    text: "Trust in the LORD with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.",
    theme: "Trust",
  },
  {
    reference: "Philippians 4:6-7",
    text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.",
    theme: "Peace",
  },
  {
    reference: "Colossians 3:16",
    text: "Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom.",
    theme: "Wisdom",
  },
  {
    reference: "James 1:22",
    text: "But be doers of the word, and not hearers only, deceiving yourselves.",
    theme: "Action",
  },
  {
    reference: "Psalm 19:7",
    text: "The law of the LORD is perfect, reviving the soul; the testimony of the LORD is sure, making wise the simple.",
    theme: "Renewal",
  },
  {
    reference: "John 1:1",
    text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    theme: "Christ",
  },
  {
    reference: "Psalm 119:11",
    text: "I have stored up your word in my heart, that I might not sin against you.",
    theme: "Purity",
  },
  {
    reference: "Jeremiah 15:16",
    text: "Your words were found, and I ate them, and your words became to me a joy and the delight of my heart.",
    theme: "Joy",
  },
  {
    reference: "Isaiah 55:11",
    text: "So shall my word be that goes out from my mouth; it shall not return to me empty, but it shall accomplish that which I purpose.",
    theme: "Purpose",
  },
  {
    reference: "Romans 12:2",
    text: "Do not be conformed to this world, but be transformed by the renewal of your mind.",
    theme: "Transformation",
  },
  {
    reference: "Psalm 119:130",
    text: "The unfolding of your words gives light; it imparts understanding to the simple.",
    theme: "Illumination",
  },
  {
    reference: "Ephesians 6:17",
    text: "And take the helmet of salvation, and the sword of the Spirit, which is the word of God.",
    theme: "Strength",
  },
  {
    reference: "Lamentations 3:22-23",
    text: "The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning.",
    theme: "Mercy",
  },
  {
    reference: "Psalm 23:1-3",
    text: "The LORD is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.",
    theme: "Rest",
  },
  {
    reference: "Galatians 5:22-23",
    text: "The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.",
    theme: "Fruitfulness",
  },
  {
    reference: "1 Thessalonians 5:16-18",
    text: "Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.",
    theme: "Gratitude",
  },
];

/**
 * Returns the daily verse for a given reading day (1-indexed).
 * Deterministic so all users on Day X see the same verse.
 */
export function getDailyVerse(dayNumber: number): DailyVerseItem {
  const index = Math.abs(dayNumber - 1) % DAILY_VERSES.length;
  return DAILY_VERSES[index];
}
