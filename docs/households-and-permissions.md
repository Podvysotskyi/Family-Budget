# Households and permissions

## Authentication and household membership

- Authentication uses Google only.
- Multiple households can exist independently.
- Each registered user has a separate login and may belong to only **one household at a time**.
- A user can create a household and becomes its owner.
- Household setup is required before using the app's features. After Google sign-in, a user without an active household must either **create a household or accept an invitation to join one** before accessing normal app pages/actions.
- The household owner can transfer ownership directly only to **another current household member with a linked Google account**. A member without a linked Google account is not eligible. No recipient approval is required.
- Ownership transfers immediately, with no pending state. The previous owner loses owner permissions when the transfer takes effect.
- A household owner must transfer ownership or delete the household before leaving it.

The exact sign-in, invitation email verification, session, and onboarding implementation remains undecided.

## Household-owned records

All household records, including accounts, transactions, connections, investments, loans, bills, income, subscriptions, schedules, and financial history, belong to the household. They may additionally be associated with a household member. Member association does not transfer ownership or make records portable between households.

All current household members can view, create, edit, and delete household financial records, accounts, and connections. They can also edit household/member details, directly update manual balances, and assign transaction categories. No record has a public/private setting. Optional member association organizes records and does not restrict these permissions. Member creation/removal, invitations, ownership transfer, and household deletion remain owner-only. Google login and personal profile settings retain their user-level behavior. All members can also manage the household's categories and subcategories.

## Users without a household

- The earlier personal Accounts/Transactions/Investments experience is superseded: financial records belong to a household and do not leave with a user.
- Require household setup before allowing access to normal app pages or actions, including financial features and the normal Profile page. Onboarding after Google sign-in provides household creation and acceptance of an invitation to an existing household.
- A user without an active household after leaving, being removed, or household deletion is subject to the same setup requirement. They cannot regain access to the former household's records through onboarding.
- Profile settings remain user-level data; this does not permit normal Profile access before household setup.
- Accepting an invitation directly satisfies required setup; invitees do not need to create a temporary household first. A user who already belongs to a household must still leave/delete it under the approved ownership rules before accepting an invitation to another household.
- The sign-in and setup screens are designed; see [UI design](ui-design.md#sign-in-and-household-setup). Signed-in users without a household can decline invitations and sign out from setup. Creating a household also asks for the creator's member nickname and confirms their timezone. Connections remain with the original household and continue syncing after the authorizing member leaves while provider authorization remains valid; the earlier personal synchronization rule is superseded.

## Members without logins

The owner can create an organizational household member without attaching a registered user. This supports organizing and assigning household financial records before that person uses the app.

- All household members can edit member details, including nicknames. Only the household owner can create/remove members and manage invitations; these administrative restrictions are confirmed under the new financial-record permissions.
- A later invitation can target an existing member without a login.
- Accepting that invitation attaches the real user to that member.
- A member without a login cannot perform app actions or receive an in-app reminder until linked to a real user.

Members have a household nickname, which is used to display their assignments. Assigned records retain that nickname when a member leaves or is removed. Nickname editing is designed (Edit member); reassignment presentation is still open; see [Open decisions](open-decisions.md#households-and-access).

## Invitations

- Only the household owner sends invitations.
- Invitations target a Google email address, including an address that has not registered yet.
- A household may have multiple pending invitations targeting the same Google email address. Sending another invitation does not require canceling an existing one.
- Accepting one invitation automatically cancels the other pending invitations from that same household to the same Google email address.
- Invitees can accept or decline.
- Invitations appear as in-app notifications and in Profile after the recipient signs in.
- Owners can cancel pending invitations.
- Invitations do not automatically expire.
- A user already in another household can receive an invitation.
- To accept, the user must first leave or delete their current household, following the ownership rules.

Multiple pending invitations to the same email are allowed; accepting one automatically cancels the others from that household to that email.

Invitations are designed in setup, the join review, Household and Profile. Profile tells owners to transfer ownership and leave, or delete the household, and tells members to leave first; the join review says existing records stay assigned to the member profile. If an invitation is no longer valid when acted on, no household access is granted. Stale or canceled invitation feedback, Google email changes and what an invitee may see before joining are still open (see [Open decisions](open-decisions.md#households-and-access)).

## Approved permission matrix

“All members” means logged-in members of the current household. They can view, create, edit, and delete financial records/accounts/connections, with no private-record exception. Existing source-field and validation constraints still apply. Owner-only household/member administrative actions remain separate.

The budget rule that past-month targets cannot be added, edited, or removed applies to all household members, including the owner, at the same UTC calendar-month boundary. General shared editing permissions do not override this domain constraint. Historical spending totals still reflect transaction imports/changes under the approved spending rules; see [Budget functionality](product-requirements.md#budget-functionality).

| Action | Who can perform it |
| --- | --- |
| View, create, edit, and delete household bills and scheduled income | All members |
| Organize bills by assignment to a member or the entire household | All members |
| Select optional payment/receiving accounts for bills, subscriptions, loan payments, or income | All members; any account in the household is selectable |
| Mark bill occurrences paid/unpaid and income occurrences received/not received | All members |
| Attach/detach accessible transactions to/from occurrences | All members with access to the transaction |
| View/edit accounts, transactions, investments, loans, and all other household records | All members; imported amount/date/payee remain read-only under the existing source-field rule |
| Edit transaction notes/category | All members |
| Create, rename, move, or delete household categories and subcategories | All members (the built-in Transfers Between Accounts category cannot be changed) |
| Edit household/member details, including members without logins | All members |
| Create household members, including members without logins | Household owner |
| Send/cancel invitations | Household owner |
| Remove a household member | Household owner |
| Transfer household ownership | Household owner; only to another current member with a linked Google account; immediate, without recipient approval |
| Delete the household | Household owner |
| Create/delete household financial records, accounts, and connections | All members |
| Change public/private visibility | No such setting; all household records are visible to all members |
| Edit manual account details or directly update its balance | All members |
| Edit/delete manual transactions | All members under the previously approved shared transaction workflow |
| Change personal timezone and reminder time | The individual user |

Loan accounts belong to the household. Repayment scheduling is optional and configured inside the loan; configured installments appear on its calendar and follow the shared bill workflow. Paid installments/extra payments update the household's Loan account balance automatically, and reversals/corrections recalculate it. All members can edit loan/payment records and directly enter manual balances. These records remain in the household when an associated member leaves. Subscriptions follow recurring bill rules.

The earlier personal-account-owner and private-account restrictions are superseded by household ownership and all-member viewing/editing. Shared access applies only within the household, not to users outside it. Category definitions belong to the household and all members can manage them and assign them to household records. See [Accounts and transactions](accounts-and-transactions.md#attachments-and-privacy) for attachments and hidden-display rules.

## Assignment

- Bills can be assigned to a specific member or the entire household.
- Assignment is for organization only.
- A bill has one shared amount.
- Assignment does not create separate member shares or restrict who can edit/pay it in the app.
- Reminder recipients are selected separately.
- Optional member association does not restrict all-member financial-record viewing, creation, editing, or deletion. Member creation/removal, invitations, ownership transfer, and household deletion remain owner-only.
- Display the assigned member using their household nickname, including on preserved records after they leave or are removed. A Former member label has not been approved.

## Leaving, removal, and deletion

| Event | Approved behavior |
| --- | --- |
| Member leaves voluntarily | All household financial records stay in the household; preserve history and remove the departing member's household access |
| Owner removes a member | Soft-delete the member relationship; preserve all household financial records and history; remove the former member's household access |
| Owner deletes household | Soft-delete the household and its membership relationships; members can create or join another household |
| Former member was associated with connections/accounts/loans | Records stay in the household and remain visible/editable by its remaining members. Member reassignment and bank authorization need planning |
| Household ownership changes | Household financial records remain in the household; transfer does not move records to the new owner's personal possession |

The owner cannot restore a soft-deleted household. No restore features were approved for deleted financial records.

An earlier request to remove a removed member's records was clarified to preserve original history and use soft deletions. The final rule is preservation, not destruction.

## Historical access after leaving or removal

Accounts, transactions, investments, loans, schedules, balances, and history remain in their original household after a member leaves or is removed. The attached-transactions-only retention/access model is superseded.

- The departing member loses household access; joining another household does not bring the original household's records with them.
- Remaining members retain viewing/editing access to all household records; there are no private fields or private accounts under the app's record visibility model. Provider credentials and authorization handling remain technical planning topics.
- Past and future calendar occurrences remain in the household, including unpaid loan installments. Shared loan-payment actions still update that household's Loan account balance; there is no departed user's portable loan balance to modify.
- Account selections and transaction attachments stay with the household's records. Departure alone no longer clears account-selection relations or makes transaction access depend on attachments.
- Historical nicknames/member associations are preserved under the existing history rules. Detailed association/reassignment workflows still need planning, but they do not create ownership or access restrictions.
- Connections continue syncing for the household after their authorizing member leaves, provided provider authorization is still valid. Expired/revoked authorization and reauthorization handling remain open.

Household deletion is soft deletion without restoration. It stops synchronization and disconnects the household's bank connections, while preserving imported history. The provider disconnect/revocation mechanics require validation and technical planning. The storage mechanism for history, optional member associations, and soft deletion remains open.

Shared household records keep change history showing the acting member, time, and previous/new values. This history is retained with household records after member departure; it is designed as a shared Change history view, and its technical implementation still requires planning.

## Role and access-change design

The design shows both the owner's Household page and the member view (names and connections editable; no member administration, invitations, ownership transfer or household deletion; Leave household), plus Edit member without Remove for members, and the Transfer ownership, Leave household and Delete household confirmations. See [UI design](ui-design.md#household-and-categories).

Removal, voluntary departure, ownership transfer, and household deletion must respect the approved permissions even if a page or modal is already open. Departure ends access to the former household's records immediately; no unsaved edit or retained link grants continued access. What an open page shows when access changes, and the technical enforcement, are still open (see [Open decisions](open-decisions.md#households-and-access)).

Historical nicknames and associations remain with records. Presentation for reassignment, repeated nicknames, or a returning member still needs a decision; there is no restore feature and records never move to another household.
