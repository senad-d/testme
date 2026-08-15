# Children's Money-Learning Game Discovery

This discovery captures the validated product domain and first-release boundaries for a child-friendly browser game about practical money choices. It focuses on observable learning and family outcomes so that product specification, experience design, and architecture can be planned as vertical slices without requiring another requirements interview.

## Actors and context

- **Child Player:** A child aged seven or older who plays independently and is comfortable with approximately second-grade reading and mathematics. The child completes short Lessons and learns how choices affect personal goals.
- **Parent:** The single supervising adult in the first release. The Parent establishes access, reviews learning progress, resets progress when needed, and chooses the Learning Currency.
- **Usage context:** One Parent Account oversees one Child Account. The game is first delivered through web browsers and makes the child's saved progress available across supported devices. A Parent must sign in on a new device before the child can open the Child Account with a child PIN.
- **Learning context:** The experience uses simulated Practice Money denominated in USD, EUR, or GBP. It does not move or award real-world money.

## Domain language

The durable glossary is in [`CONTEXT.md`](../../CONTEXT.md). This discovery resolved the following language:

- **Child Player:** The independent learner, aged seven or older, with approximately second-grade reading and math ability.
- **Parent Account:** The supervising adult's cross-device identity and the prerequisite for using the Child Account on a new device.
- **Child Account:** The single Parent-created player identity, protected by a child PIN and limited to a parent-chosen display name and learning progress.
- **Parent Area:** The child-inaccessible area for reviewing progress, resetting progress, and selecting currency.
- **Practice Money:** A simulated balance with no real-world value, displayed in the selected real-world currency.
- **Learning Currency:** The Parent-selected USD, EUR, or GBP denominations used by Lessons.
- **Currency Switch:** A one-to-one re-denomination that retains numeric values while changing the currency.
- **Goal-Based Money Choice:** A choice evaluated by its effect on the child's selected goal, not by a universal rule that spending or saving is always correct.
- **Lesson:** A self-contained play session of about five minutes with a story, earning, a spend-or-save choice, a visible consequence, a friendly recap, and a retry opportunity.
- **Lesson Mastery:** Demonstrated understanding of how a choice affects a selected goal, including success in a similar retry when feedback was needed.
- **Learning Path:** Five stages covering earning, needs and wants, spending within available money, saving toward a goal, and combining the skills in a simple plan.
- **Learning Reward:** A non-competitive star, badge, or visual unlock that celebrates learning.
- **Closed Play Experience:** A child-facing environment without real purchases, advertisements, chat, social sharing, or external links, and without collecting the child's real name, location, or photo.

## Requirements as vertical slices

### Slice 1 — Establish one safe family game

**User-visible outcome:** A Parent establishes the first-release one-Parent/one-child relationship, and the child can return to their own protected play experience across supported devices.

**Acceptance signals:**

- The Parent can establish one Parent Account and one Child Account with a parent-chosen display name and child PIN.
- On a new supported device, the Parent must authenticate before the Child Account can be opened.
- After Parent authentication, the child can use their PIN to resume saved progress and rewards.
- The child cannot enter or alter the Parent Area.
- The child-facing identity does not request the child's real name, location, or photo.

**Dependencies:** None.

**Open questions:** Parent-account credential, recovery, consent, retention, and deletion rules; child-PIN creation and recovery rules; supported browser baseline.

### Slice 2 — Complete an accessible short Lesson

**User-visible outcome:** The Child Player independently completes a calm, understandable Lesson in about five minutes and can replay it.

**Acceptance signals:**

- The Lesson presents a short everyday story, an earning activity, a spend-or-save choice, an immediate consequence, a friendly recap, and a retry.
- Optional read-aloud narration accompanies short text, clear pictures, and large controls.
- Instructions do not rely on color alone.
- The experience supports both touch and keyboard interaction.
- Feedback avoids harsh failure sounds or punitive language.
- Completion can award a star, badge, or friendly visual unlock.
- The child can replay the Lesson without losing prior progress or rewards.

**Dependencies:** Slice 1.

**Open questions:** Visual theme, characters, supported language, narration voice, and exact everyday scenarios.

### Slice 3 — Learn that earning follows effort

**User-visible outcome:** Through three distinct Lessons, the Child Player recognizes that Practice Money can be earned through age-appropriate effort.

**Acceptance signals:**

- The first Learning Path stage contains three replayable Lessons, each targeting about five minutes.
- Each Lesson uses a different everyday scenario while reinforcing the earning-through-effort idea.
- The child receives calm, immediate feedback about the outcome of the activity.
- Lesson Mastery is measured through understanding rather than speed or competition.

**Dependencies:** Slice 2.

**Open questions:** The specific forms of effort and the boundaries around chores, work, gifts, and allowance.

### Slice 4 — Distinguish needs from wants

**User-visible outcome:** Through three distinct Lessons, the Child Player considers whether a purchase is a need or a want within an everyday scenario.

**Acceptance signals:**

- The second Learning Path stage contains three replayable Lessons, each targeting about five minutes.
- The child classifies or compares needs and wants using second-grade-level language and math.
- Feedback explains the scenario without shaming a preference or purchase.
- The child can demonstrate understanding in a similar retry after feedback when needed.

**Dependencies:** Slices 2 and 3.

**Open questions:** Which examples are sufficiently universal across families and cultures.

### Slice 5 — Spend within available money

**User-visible outcome:** Through three distinct Lessons, the Child Player learns that purchases are constrained by the Practice Money available.

**Acceptance signals:**

- The third Learning Path stage contains three replayable Lessons, each targeting about five minutes.
- The child compares an available balance with an age-appropriate price in the selected Learning Currency.
- The game visibly shows how a purchase changes the available balance.
- Feedback supports retry and understanding rather than punishment.

**Dependencies:** Slices 2–4 and Learning Currency selection from Slice 9.

**Open questions:** Whether early Lessons use whole currency units only and when smaller denominations are introduced.

### Slice 6 — Save toward a chosen goal

**User-visible outcome:** Through three distinct Lessons, the Child Player delays some spending and observes progress toward a visible goal they selected.

**Acceptance signals:**

- The fourth Learning Path stage contains three replayable Lessons, each targeting about five minutes.
- A goal and its required amount are clearly visible in the selected Learning Currency.
- The child can compare spending now with retaining Practice Money for the goal.
- The consequence shows how the choice advances or delays the goal without declaring spending or saving universally correct.

**Dependencies:** Slices 2–5 and Learning Currency selection from Slice 9.

**Open questions:** The initial set of savings goals and how much goal choice a child receives.

### Slice 7 — Make a simple goal-based money plan

**User-visible outcome:** Through three distinct Lessons, the Child Player combines earning, needs-versus-wants judgment, spending constraints, and saving into a simple plan.

**Acceptance signals:**

- The fifth Learning Path stage contains three replayable Lessons, each targeting about five minutes.
- Each Lesson presents competing uses of limited Practice Money and a selected goal.
- The child identifies how their choice affects the goal.
- If feedback was needed, the child demonstrates Lesson Mastery by succeeding in a similar retry scenario.
- The explanation remains goal-based and does not portray all spending or all saving as inherently right or wrong.

**Dependencies:** Slices 2–6 and Learning Currency selection from Slice 9.

**Open questions:** How much freedom children have to allocate money and how many simultaneous choices remain understandable at the target ability level.

### Slice 8 — Support learning from the Parent Area

**User-visible outcome:** The Parent can understand what the child completed, identify skills needing practice, and offer a fresh start when appropriate.

**Acceptance signals:**

- The Parent sees completed Lessons by Learning Path stage.
- The Parent sees which skills have not yet met the Lesson Mastery rule and therefore need practice.
- The Parent can reset the Child Player's progress.
- Resetting progress is unavailable to the child and requires a deliberate Parent action.

**Dependencies:** Slice 1. Progress reporting becomes more informative as Slices 2–7 are added.

**Open questions:** Whether resetting applies to all progress only or may target an individual stage, and whether confirmation or recovery from an accidental reset is required.

### Slice 9 — Choose and switch the Learning Currency

**User-visible outcome:** The Parent can present all money Lessons in USD, EUR, or GBP without introducing foreign-exchange arithmetic.

**Acceptance signals:**

- The Parent chooses USD, EUR, or GBP from the Parent Area.
- Lessons consistently show balances, prices, goals, and denominations in the selected Learning Currency.
- A Currency Switch retains every numeric balance, price, and goal while changing the denomination one-to-one; for example, 10 USD becomes 10 EUR or 10 GBP.
- Existing Lesson progress and rewards remain available after the switch.
- The child cannot change the Learning Currency.

**Dependencies:** Slice 1. Money-valued Lessons depend on the selected currency.

**Open questions:** The default Learning Currency and which physical or symbolic denominations each currency teaches.

### Slice 10 — Remain a closed, non-competitive child experience

**User-visible outcome:** A child can learn independently without exposure to monetization, social contact, coercive reward pressure, or child-facing exits from the game.

**Acceptance signals:**

- The child experience contains no real-money purchase, advertisement, chat, social sharing, or external link.
- Practice Money and Learning Rewards have no real-world value.
- There are no leaderboards, lost-progress penalties, or daily-streak pressure.
- The experience does not collect the child's real name, location, or photo.

**Dependencies:** Applies to every child-facing slice.

**Open questions:** Applicable child-privacy jurisdictions, age/consent notices, security expectations, and whether any Parent-only help links may leave the game.

## Decisions

- [ADR-0001: Use one-to-one learning currency switches](../adr/0001-use-one-to-one-learning-currency-switches.md) — favors simple earning, spending, and saving lessons over realistic foreign-exchange conversion.

## Out of scope

The first release explicitly excludes:

- multiple Child Accounts under one Parent Account;
- teacher, classroom, or school features;
- multiplayer, chat, social sharing, and leaderboards;
- real bank, payment, or purchase connections;
- debt, interest, investing, and taxes;
- Parent- or child-authored Lessons;
- live or realistic foreign-exchange conversion;
- advertising, punitive loss of progress, and daily-streak pressure.

## Open questions

- What visual world, characters, and tone should connect the Lessons?
- Which language is supported first, and is localization required in the first release?
- What are the Parent Account, child PIN, consent, recovery, data-retention, and data-deletion rules?
- Which browsers and devices define first-release support, and is offline play required?
- Which fifteen everyday scenarios will be used, and how will they avoid cultural or household assumptions?
- Which denominations and decimal concepts are appropriate for each Learning Path stage?
- Which savings goals can children choose?
- Does progress reset affect everything or allow stage-level reset, and can an accidental reset be recovered?
- Which child-privacy and accessibility standards or jurisdictions must govern release validation?
