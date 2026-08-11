import type { ActivityEntry, LoadCode, ResultCode } from "../game/store";
import type { ParentAccessCode } from "../game/parent-access";
import type { AdventureLoadCode, AdventureResultCode, AnswerId, BadgeId, GlossaryId, MissionId } from "../game/adventure";

export const CONFIG = {
  currency: "zlatnik",
  debtLimit: 100,
  quickAmounts: [5, 10, 20] as const,
};

export const CHORES = [
  { id: "make-bed", name: "Posloži krevet", reward: 5 },
  { id: "tidy-toys", name: "Pospremi igračke", reward: 8 },
  { id: "water-plants", name: "Zalij biljke", reward: 6 },
  { id: "set-table", name: "Postavi stol", reward: 10 },
  { id: "fold-laundry", name: "Pomozi složiti rublje", reward: 12 },
  { id: "pack-school-supplies", name: "Složi školski pribor", reward: 4 },
  { id: "feed-pets", name: "Nahrani ljubimce", reward: 7 },
  { id: "sweep-kitchen", name: "Pometi kuhinju", reward: 9 },
  { id: "help-garden", name: "Pomozi u vrtu", reward: 11 },
  { id: "sort-recycling", name: "Razvrstaj otpad", reward: 14 },
] as const;

export const EARNINGS_CHALLENGE = [
  { choices: ["set-table", "make-bed"], correctId: "set-table" },
  { choices: ["help-garden", "tidy-toys"], correctId: "help-garden" },
  { choices: ["sort-recycling", "fold-laundry"], correctId: "sort-recycling" },
] as const;

export const PETS = [
  { id: "fish", name: "Ribica", price: 30, emoji: "🐟" },
  { id: "rabbit", name: "Kunić", price: 50, emoji: "🐰" },
  { id: "cat", name: "Mačka", price: 60, emoji: "🐱" },
  { id: "dog", name: "Pas", price: 80, emoji: "🐶" },
  { id: "bird", name: "Ptičica", price: 40, emoji: "🐦" },
  { id: "goat", name: "Koza", price: 70, emoji: "🐐" },
  { id: "horse", name: "Konj", price: 100, emoji: "🐴" },
  { id: "cow", name: "Krava", price: 110, emoji: "🐄" },
] as const;

export const ITEMS = [
  { id: "bowl", name: "Zdjelica", price: 10, emoji: "🥣", category: "pet" },
  { id: "toy", name: "Igračka", price: 15, emoji: "🧶", category: "pet" },
  { id: "pet-bed", name: "Krevetić", price: 20, emoji: "🛏️", category: "pet" },
  { id: "plant", name: "Biljka", price: 12, emoji: "🪴", category: "house" },
  { id: "rug", name: "Tepih", price: 18, emoji: "🟫", category: "house" },
  { id: "wall-picture", name: "Zidna slika", price: 22, emoji: "🖼️", category: "house" },
  { id: "bird-perch", name: "Stajalica za ptice", price: 16, emoji: "🪵", category: "pet" },
  { id: "pet-brush", name: "Četka za ljubimce", price: 14, emoji: "🪮", category: "pet" },
  { id: "lamp", name: "Svjetiljka", price: 16, emoji: "🏮", category: "house" },
  { id: "bookshelf", name: "Polica za knjige", price: 24, emoji: "📚", category: "house" },
] as const;

export const THEMES = [
  { id: "sun", name: "Sunce" },
  { id: "sea", name: "More" },
  { id: "forest", name: "Šuma" },
] as const;

export const ADVENTURE_MISSIONS: Record<MissionId, {
  title: string; story: string; instruction: string; question: string; actionSteps: ReadonlyArray<string>;
  choices: ReadonlyArray<{ id: AnswerId; label: string }>; correctExplanation: string; wrongExplanation: string;
}> = {
  saving: {
    title: "Misija kasice", story: "Ljubimci žele sačuvati zlatnike za veseli izlet.", instruction: "Odgovori na pitanje i spremi barem 5 zlatnika u kasicu.", actionSteps: ["Spremi barem 5 zlatnika u kasicu."],
    question: "Zašto stavljamo zlatnike u kasicu?", choices: [{ id: "saving-later", label: "Čuvamo ih za cilj koji želimo kasnije." }, { id: "saving-disappears", label: "Da zlatnici nestanu i više ih ne možemo koristiti." }],
    correctExplanation: "Točno! Štednja čuva zlatnike za neki kasniji cilj.", wrongExplanation: "Pokušaj ponovno. Zlatnici u kasici ne nestaju — čekaju tvoj kasniji cilj.",
  },
  earning: {
    title: "Misija zarade", story: "Vrijedna šapica želi pomoći u kući i pošteno zaraditi nagradu.", instruction: "Odgovori na pitanje, završi posao i pričekaj da ga roditelj potvrdi.", actionSteps: ["Označi posao kao gotov i neka ga roditelj potvrdi."],
    question: "Kada nagrada za posao stiže u novčanik?", choices: [{ id: "earning-after-approval", label: "Nakon što završim posao i roditelj ga potvrdi." }, { id: "earning-before-work", label: "Prije nego što napravim posao." }],
    correctExplanation: "Bravo! Nagrada stiže tek nakon obavljenog i potvrđenog posla.", wrongExplanation: "Pokušaj ponovno. Prvo obavi posao, a roditelj ga zatim potvrđuje.",
  },
  purchase: {
    title: "Misija pametne kupnje", story: "Trgovina je puna zabavnih stvari, ali pametna šapica prvo provjerava cijenu.", instruction: "Odgovori na pitanje i kupi jednog ljubimca ili jednu stvar zlatnicima iz novčanika.", actionSteps: ["Kupi jednog ljubimca ili jednu stvar iz novčanika."],
    question: "Odakle igra uzima zlatnike kada nešto kupiš?", choices: [{ id: "purchase-wallet", label: "Iz novčanika, ako u njemu ima dovoljno zlatnika." }, { id: "purchase-savings", label: "Automatski iz kasice, bez provjere novčanika." }],
    correctExplanation: "Točno! Kupnja provjerava i naplaćuje novčanik, a kasica ostaje sačuvana.", wrongExplanation: "Pokušaj ponovno. Trgovina koristi samo zlatnike koji su u novčaniku.",
  },
  loan: {
    title: "Misija zajma", story: "Most je zatvoren dok šapica ne pokaže da razumije zajam i dug.", instruction: "Odgovori na pitanje, posudi zlatnike pa vrati barem cijeli posuđeni iznos.", actionSteps: ["Posudi odabrani broj zlatnika.", "Vrati barem onoliko zlatnika koliko si posudila u ovoj misiji."],
    question: "Što se događa s dugom kada posudiš pa vratiš zlatnike?", choices: [{ id: "loan-debt-changes", label: "Posuđivanje povećava dug, a vraćanje ga smanjuje." }, { id: "loan-free-coins", label: "Posuđeni zlatnici su poklon i ne stvaraju dug." }],
    correctExplanation: "Odlično! Zajam povećava dug, a svako vraćanje dug smanjuje.", wrongExplanation: "Pokušaj ponovno. Posuđeni zlatnici nisu poklon — u igri ih treba vratiti.",
  },
};

export const ADVENTURE_BADGES: Record<BadgeId, { name: string; description: string; emoji: string }> = {
  "piggy-bank": { name: "Čuvarica kasice", description: "Sačuvala si zlatnike za kasnije.", emoji: "🐷" },
  "helping-paw": { name: "Vrijedna šapica", description: "Naučila si kako se nagrada zaradi.", emoji: "🐾" },
  "smart-shopper": { name: "Pametna kupnja", description: "Provjerila si novčanik prije kupnje.", emoji: "🛍️" },
  "debt-expert": { name: "Znalica o dugu", description: "Posudila si i vratila zlatnike.", emoji: "🌟" },
};

export const MONEY_SCHOOL: Record<GlossaryId, { title: string; definition: string; example: string }> = {
  wallet: { title: "Novčanik", definition: "Novčanik drži zlatnike koje možeš sada potrošiti.", example: "Ako imaš 10 zlatnika i potrošiš 4, ostaje ti 6." },
  savings: { title: "Kasica", definition: "Kasica čuva zlatnike za cilj koji želiš kasnije.", example: "Spremiš li 5 pa još 5 zlatnika, u kasici je 10." },
  earning: { title: "Zarada", definition: "Zarada je nagrada koju dobiješ za obavljen i potvrđen posao.", example: "Posao vrijedan 8 zlatnika nakon potvrde donosi 8 zlatnika." },
  price: { title: "Cijena", definition: "Cijena govori koliko zlatnika trebaš dati za nešto.", example: "Stvar cijene 12 zlatnika možeš kupiti kada u novčaniku imaš barem 12." },
  loan: { title: "Zajam", definition: "Zajam u igri daje zlatnike sada, ali ih poslije treba vratiti.", example: "Posudiš li 10 zlatnika, dug se poveća za 10." },
  debt: { title: "Dug", definition: "Dug pokazuje koliko posuđenih zlatnika još trebaš vratiti.", example: "Od duga 10 vratiš 4 zlatnika pa ostaje dug 6." },
};

export const HR = {
  appName: "Moja trgovina ljubimaca",
  welcome: "Uči o novcu, brini se o ljubimcima i uredi njihovu kuću!",
  fictionalNotice: "Svi zlatnici, zajmovi i kupnje samo su dio igre. Ne koristimo pravi novac.",
  startupError: "Igra se trenutačno ne može pokrenuti. Pokušaj ponovno učitati stranicu.",
  genericError: "Nešto nije uspjelo. Pokušaj ponovno.",
  skipLink: "Preskoči na glavni sadržaj",
  navigationLabel: "Glavna navigacija",
  navAdventure: "Pustolovina",
  navMoney: "Moj novac",
  navChores: "Poslovi",
  navShop: "Trgovina",
  navHouse: "Moja kuća",
  navParent: "Kutak za roditelje",
  currentView: "Otvorena stranica",
  adventureHeading: "Pustolovina sa šapicama",
  adventureIntro: "Prati stazu, riješi četiri novčane misije i osvoji četiri ukrasne značke!",
  adventureMapLabel: "Staza novčanih misija",
  adventureGuide: "Luna, tvoja vodičica",
  adventureGuideText: "Bok! Zajedno ćemo učiti, isprobavati i slaviti svaki novi korak.",
  starsLabel: "Osvojene zvjezdice",
  starsValue: (amount: number) => `${amount} od 4 zvjezdice`,
  badgesHeading: "Polica znački",
  badgeLocked: "Značka još nije osvojena",
  missionCurrent: "Trenutačna misija",
  missionLocked: "Zaključano — dovrši prethodnu misiju",
  missionCompleted: "Dovršeno",
  journeyCompleted: "Sve su misije dovršene! Sada znaš pažljivo štedjeti, zaraditi, kupovati i vratiti zajam.",
  questionHeading: "Pitanje za malu znalicu",
  answerButton: "Odaberi odgovor",
  checklistHeading: "Moji koraci",
  knowledgeStep: "Točno odgovori na pitanje",
  actionStep: "Napravi novčani zadatak iz misije",
  stepDone: "Gotovo",
  stepTodo: "Još treba napraviti",
  goToAction: "Kreni na zadatak",
  returnAdventure: "Vrati se u Pustolovinu",
  currentMissionHeading: "Moj sljedeći pustolovni korak",
  moneySchoolHeading: "Mala škola novca",
  moneySchoolIntro: "Otvori temu kad god želiš kratko objašnjenje i primjer sa zlatnicima.",
  exampleLabel: "Primjer",
  decorativeSceneLabel: "Ukrasni krajolik pustolovine",
  wallet: "Novčanik",
  savings: "Kasica",
  debt: "Dug",
  coins: "zlatnika",
  balanceDescription: "Stanje je prikazano u izmišljenim zlatnicima.",
  moneyHeading: "Moj novac",
  moneyIntro: "Odaberi koliko zlatnika želiš premjestiti. Dobro razmisli prije svake odluke.",
  amountLabel: "Broj zlatnika",
  amountPlaceholder: "Upiši cijeli broj",
  quickAmountsLabel: "Brzi odabir iznosa",
  saveButton: "Stavi u kasicu",
  withdrawButton: "Uzmi iz kasice",
  borrowButton: "Posudi zlatnike",
  repayButton: "Vrati dug",
  savingHelp: "Zlatnike iz novčanika možeš sačuvati u kasici za kasnije.",
  loanHelp: "Zajam je samo dio igre, bez kamata. Ukupni dug može biti najviše 100 zlatnika.",
  activityHeading: "Moje posljednje aktivnosti",
  goalHeading: "Plan mog cilja",
  goalIntro: "Isplaniraj izmišljenu kupnju zlatnicima iz igre koristeći zlatnike iz novčanika i kasice.",
  goalTargetLabel: "Cijena izmišljenog cilja",
  goalChoreLabel: "Posao za plan",
  goalButton: "Izračunaj plan",
  goalTargetError: "Upiši pozitivan cijeli broj zlatnika koji nije prevelik.",
  goalChoreError: "Odaberi jedan od ponuđenih poslova.",
  goalCovered: (target: number) => `Za izmišljeni cilj od ${target} zlatnika već imaš dovoljno u novčaniku i kasici. Nije potreban nijedan dodatni dovršeni posao s potvrdom roditelja.`,
  goalMissing: (target: number, missing: number, choreName: string, reward: number, approvals: number) => `Za izmišljeni cilj od ${target} zlatnika nedostaje ti ${missing} zlatnika. Odabrani posao ${choreName} donosi ${reward} zlatnika tek nakon potvrde roditelja. Potrebno je ${approvals} dovršenih i od roditelja potvrđenih poslova.`,
  goalDisclaimer: "Ovo je samo plan u igri. Zlatnici nisu pravi novac, a nagrada za posao nije zajamčena.",
  choresHeading: "Poslovi u kući",
  choresIntro: "Kad završiš posao, odaberi Gotovo! Roditelj zatim provjerava posao.",
  earningsChallengeHeading: "Izazov zarade",
  earningsChallengeIntro: "Usporedi nagrade u izmišljenim zlatnicima i odaberi posao s većom nagradom.",
  earningsChallengeQuestion: "Koji posao donosi više zlatnika u igri?",
  earningsChallengeProgress: (round: number, total: number) => `${round} od ${total}`,
  earningsChallengeAnswerAccessible: (name: string, reward: number) => `Odaberi posao ${name}, nagrada ${reward} zlatnika u igri`,
  earningsChallengeCorrect: "Točno! Slijedi nova usporedba.",
  earningsChallengeWrong: "Pokušaj ponovno. Pogledaj koliko zlatnika donosi svaki posao u igri.",
  earningsChallengeComplete: "Bravo! Dovršila si Izazov zarade i usporedila sve nagrade u igri.",
  doneButton: "Gotovo!",
  rewardLabel: "Nagrada",
  statusLabel: "Stanje",
  statusTodo: "Za napraviti",
  statusPending: "Čeka potvrdu",
  statusApproved: "Potvrđeno",
  statusReturned: "Vrati na doradu",
  shopHeading: "Trgovina ljubimaca",
  shopIntro: "Kupuj samo zlatnicima iz novčanika. Kasica i zajam ne koriste se automatski.",
  animalsHeading: "Ljubimci",
  petItemsHeading: "Stvari za ljubimce",
  houseItemsHeading: "Ukrasi za kuću",
  priceLabel: "Cijena",
  buyButton: "Kupi",
  ownedLabel: "Već imaš",
  unaffordableLabel: "Nemaš dovoljno zlatnika",
  inventoryHeading: "Moje kupljene stvari",
  houseHeading: "Moja kuća",
  houseIntro: "Odaberi temu i postavi kupljene ljubimce i stvari u slobodna mjesta. Nije potrebno povlačenje.",
  themeLabel: "Tema kuće",
  selectThemeButton: "Odaberi temu",
  petSlotsHeading: "Mjesta za ljubimce",
  itemSlotsHeading: "Mjesta za stvari",
  emptySlot: "Slobodno mjesto",
  houseFull: "Sva odgovarajuća mjesta trenutačno su zauzeta.",
  assetLabel: "Što želiš postaviti?",
  slotLabel: "Odaberi mjesto",
  placeButton: "Postavi",
  moveLabel: "Premjesti u mjesto",
  moveButton: "Premjesti",
  removeButton: "Ukloni",
  unplacedPets: "Ljubimci izvan kuće",
  unplacedItems: "Stvari izvan kuće",
  parentHeading: "Kutak za roditelje",
  parentIntro: "Zaštićeni roditeljski kutak služi za dodavanje zlatnika i pregled poslova.",
  parentSetupHeading: "Postavi roditeljski PIN",
  parentSetupIntro: "Izradi PIN od točno šest znamenki. PIN vrijedi samo u ovom pregledniku i nije korisnički račun.",
  parentUnlockHeading: "Otključaj roditeljski kutak",
  parentUnlockIntro: "Upiši roditeljski PIN od šest znamenki za pristup kontrolama.",
  parentPinLabel: "Roditeljski PIN",
  parentPinConfirmLabel: "Ponovi roditeljski PIN",
  parentPinDescription: "Upiši točno šest znamenki, bez slova i razmaka.",
  parentSetupButton: "Postavi PIN i otključaj",
  parentUnprovisionedHeading: "Roditeljski pristup nije postavljen",
  parentUnprovisioned: "Roditeljski pristup još nije pripremljen za ovaj profil preglednika. Odrasla osoba koja je pripremila igru mora ga postaviti izvan dječjeg sučelja.",
  parentUnlockButton: "Otključaj",
  parentLockButton: "Zaključaj",
  parentLockAccessible: "Zaključaj roditeljski kutak",
  parentLocalNotice: "Zaštita vrijedi samo na ovom uređaju i u ovom profilu preglednika.",
  parentForgotten: "Ako zaboraviš PIN, moraš izbrisati lokalne podatke ove igre. Time se trajno brišu i PIN i sav napredak igre.",
  parentUnavailableHeading: "Roditeljski kutak nije dostupan",
  parentUnavailable: "Sigurno otključavanje trenutačno nije dostupno. Otvori igru putem sigurne HTTPS veze i pokušaj ponovno.",
  parentDenied: "Roditeljska radnja nije dopuštena dok je kutak zaključan.",
  parentLocked: "Roditeljski kutak je zaključan.",
  grantHeading: "Dodaj zlatnike",
  grantButton: "Dodaj u novčanik",
  pendingHeading: "Poslovi za pregled",
  approveButton: "Potvrdi",
  returnButton: "Vrati na doradu",
  feedbackLabel: "Poruka igre",
  formError: "Upiši pozitivan cijeli broj zlatnika.",
  petImageAlt: (name: string) => `Sličica ljubimca: ${name}`,
  itemImageAlt: (name: string) => `Sličica stvari: ${name}`,
  balanceValue: (amount: number) => `${amount} zlatnika`,
  balanceAccessible: (label: string, amount: number) => `${label}: ${amount} zlatnika`,
  rewardValue: (amount: number) => `${amount} zlatnika`,
  labeledValue: (label: string, value: string) => `${label}: ${value}`,
  priceValue: (amount: number) => `${amount} zlatnika`,
  choreDetails: (name: string, amount: number) => `${name} — nagrada ${amount} zlatnika`,
  catalogDetails: (name: string, amount: number) => `${name} — cijena ${amount} zlatnika`,
  inventoryDetails: (name: string, amount: number) => `${name} — količina ${amount}`,
  quantityValue: (amount: number) => `Količina: ${amount}`,
  slotName: (number: number) => `Mjesto ${number}`,
  placeAccessible: (name: string, slot: string) => `Postavi ${name} u ${slot}`,
  moveAccessible: (name: string) => `Premjesti ${name}`,
  removeAccessible: (name: string) => `Ukloni ${name} iz kuće`,
  buyAccessible: (name: string, price: number) => `Kupi ${name} za ${price} zlatnika`,
  choreAccessible: (name: string) => `Označi posao ${name} kao gotov`,
  approveAccessible: (name: string) => `Potvrdi posao ${name}`,
  returnAccessible: (name: string) => `Vrati posao ${name} na doradu`,
} as const;

export const PARENT_ACCESS_MESSAGES: Record<ParentAccessCode, string> = {
  "setup-required": "Roditeljski pristup nije postavljen za ovaj profil preglednika.",
  "credential-present": "Roditeljski kutak je zaključan.",
  "setup-success": "Roditeljski PIN je postavljen, a kutak je otključan.",
  "unlock-success": "Roditeljski kutak je otključan.",
  "invalid-format": "PIN mora sadržavati točno šest znamenki.",
  mismatch: "Upisani PIN-ovi nisu jednaki.",
  "wrong-pin": "PIN nije točan. Pokušaj ponovno.",
  "malformed-record": "Spremljena zaštita nije valjana. Roditeljski kutak ostaje zaključan.",
  "unknown-version": "Spremljena zaštita je iz nepoznate inačice. Roditeljski kutak ostaje zaključan.",
  "crypto-unavailable": "Sigurno otključavanje nije dostupno. Roditeljski kutak ostaje zaključan.",
  "storage-unavailable": "Zaštitu nije moguće pročitati ili spremiti. Roditeljski kutak ostaje zaključan.",
};

export const ADVENTURE_MESSAGES: Record<AdventureLoadCode | AdventureResultCode, string> = {
  "adventure-load-empty": "Nova pustolovina je spremna!",
  "adventure-load-malformed": "Spremljena pustolovina nije čitljiva. Počinješ sigurnu novu pustolovinu, a stari zapis nije promijenjen.",
  "adventure-load-unknown-version": "Spremljena pustolovina je iz nepoznate inačice. Počinješ sigurnu novu pustolovinu, a stari zapis nije promijenjen.",
  "adventure-load-invalid-state": "Spremljena pustolovina nije valjana. Počinješ sigurnu novu pustolovinu, a stari zapis nije promijenjen.",
  "adventure-load-unavailable": "Napredak pustolovine nije moguće pročitati. Možeš nastaviti, ali promjene možda neće ostati spremljene.",
  "adventure-save-unavailable": "Korak je prihvaćen, ali napredak pustolovine nije bilo moguće spremiti.",
  "adventure-answer-correct": "Točan odgovor! Sada dovrši novčani zadatak.",
  "adventure-answer-wrong": "Nije još točno, ali možeš odmah pokušati ponovno.",
  "adventure-answer-locked": "Ta misija još nije otključana.",
  "adventure-event-recorded": "Novčani korak je zabilježen! Dovrši i preostali dio misije.",
  "adventure-event-rejected": "Ovaj korak ne pripada trenutačnoj misiji pa napredak nije promijenjen.",
  "adventure-event-duplicate": "Taj je korak već zabilježen i ne donosi dodatnu zvjezdicu.",
  "adventure-mission-completed": "Misija je dovršena! Osvojila si zvjezdicu i novu značku.",
  "adventure-journey-completed": "Bravo! Dovršila si cijelu pustolovinu i osvojila sve četiri značke.",
};

export const LOAD_MESSAGES: Record<LoadCode, string> = {
  "load-empty": "Nova igra je spremna!",
  "load-malformed": "Spremljeni podaci nisu čitljivi. Pokrenuta je nova igra, a stari podaci nisu promijenjeni.",
  "load-unknown-version": "Spremljena igra je iz nepoznate inačice. Pokrenuta je nova igra, a stari podaci nisu promijenjeni.",
  "load-invalid-state": "Spremljena igra nije valjana. Pokrenuta je nova igra, a stari podaci nisu promijenjeni.",
  "load-unavailable": "Spremanje u ovom pregledniku nije dostupno. Igru možeš nastaviti, ali promjene možda neće ostati spremljene.",
  "save-unavailable": "Promjena je prihvaćena, ali je nije bilo moguće spremiti u preglednik.",
};

export const RESULT_MESSAGES: Record<ResultCode, string> = {
  "activity-empty": "Još nema aktivnosti.",
  "chore-requests-empty": "Nema poslova koji čekaju pregled.",
  "pet-inventory-empty": "Još nemaš kupljenog ljubimca.",
  "item-inventory-empty": "Još nemaš kupljenih stvari.",
  "purchase-unavailable": "Ova kupnja trenutačno nije dostupna.",
  "grant-ok": "Zlatnici su dodani u novčanik.",
  "save-ok": "Zlatnici su spremljeni u kasicu.",
  "withdraw-ok": "Zlatnici su vraćeni iz kasice u novčanik.",
  "borrow-ok": "Zlatnici su posuđeni. Ne zaboravi pratiti dug.",
  "repay-ok": "Dio duga je vraćen.",
  "chore-request-ok": "Posao čeka pregled roditelja.",
  "chore-approve-ok": "Posao je potvrđen, a nagrada dodana u novčanik.",
  "chore-return-ok": "Posao je vraćen na doradu bez isplate nagrade.",
  "pet-purchase-ok": "Ljubimac je kupljen i čeka te u inventaru.",
  "item-purchase-ok": "Stvar je kupljena i dodana u inventar.",
  "theme-select-ok": "Tema kuće je promijenjena.",
  "house-place-ok": "Odabrano je postavljeno u kuću.",
  "house-move-ok": "Odabrano je premješteno.",
  "house-remove-ok": "Odabrano je vraćeno u inventar.",
  "invalid-amount": "Iznos mora biti pozitivan cijeli broj.",
  "insufficient-wallet": "U novčaniku nema dovoljno zlatnika.",
  "insufficient-savings": "U kasici nema dovoljno zlatnika.",
  "debt-limit-exceeded": "Ovim iznosom dug bi prešao dopuštenih 100 zlatnika.",
  "repayment-exceeds-debt": "Ne možeš vratiti više zlatnika nego što iznosi dug.",
  "unknown-chore": "Odabrani posao ne postoji.",
  "chore-already-pending": "Taj posao već čeka pregled roditelja.",
  "unknown-chore-request": "Zahtjev za taj posao nije pronađen.",
  "chore-request-already-resolved": "Taj je zahtjev već riješen.",
  "unknown-shop-entry": "Odabrana stvar ne postoji u trgovini.",
  "pet-already-owned": "Već imaš tog ljubimca.",
  "unknown-theme": "Odabrana tema ne postoji.",
  "unknown-house-slot": "Odabrano mjesto u kući ne postoji.",
  "house-slot-occupied": "To je mjesto već zauzeto.",
  "house-slot-empty": "To je mjesto već prazno.",
  "unknown-asset": "Odabrani ljubimac ili stvar ne postoji.",
  "asset-not-owned": "Možeš postaviti samo ono što si kupio ili kupila.",
  "asset-already-placed": "Odabrani ljubimac već je u kući.",
  "item-quantity-exhausted": "Sve kupljene primjerke te stvari već si postavio ili postavila.",
};

export function activityMessage(activity: ActivityEntry): string {
  switch (activity.code) {
    case "coins-granted": return `Roditelj je dodao ${activity.amount} zlatnika.`;
    case "coins-saved": return `U kasicu je spremljeno ${activity.amount} zlatnika.`;
    case "savings-withdrawn": return `Iz kasice je uzeto ${activity.amount} zlatnika.`;
    case "coins-borrowed": return `Posuđeno je ${activity.amount} zlatnika u igri.`;
    case "debt-repaid": return `Vraćeno je ${activity.amount} zlatnika duga.`;
    case "chore-reward-paid": return `Za posao ${activity.name} zarađeno je ${activity.amount} zlatnika.`;
    case "pet-purchased": return `Kupljen je ljubimac ${activity.name} za ${activity.amount} zlatnika.`;
    case "item-purchased": return `Kupljena je stvar ${activity.name} za ${activity.amount} zlatnika.`;
  }
}

export function adventureMessageForCode(code: unknown): string {
  if (typeof code === "string" && Object.hasOwn(ADVENTURE_MESSAGES, code)) return ADVENTURE_MESSAGES[code as keyof typeof ADVENTURE_MESSAGES];
  return HR.genericError;
}

export function messageForCode(code: unknown): string {
  if (typeof code === "string" && Object.hasOwn(LOAD_MESSAGES, code)) return LOAD_MESSAGES[code as LoadCode];
  if (typeof code === "string" && Object.hasOwn(RESULT_MESSAGES, code)) return RESULT_MESSAGES[code as ResultCode];
  return HR.genericError;
}
