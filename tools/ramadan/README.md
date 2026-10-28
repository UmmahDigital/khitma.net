# Ramadan announcement

The app offers Ramadan khitmas by itself from the middle of Sha'ban (the home page card, the "في رمضان" deadline, the
daily template and, from the 20th of Ramadan, the "continue weekly after Eid?" question). These two messages are for
publishing by hand around **16 Sha'ban 1448 (about 24 January 2027)**. Both need a review before they go out.

## 1. In-app notification

Everyone who opens the app sees the newest active document in the `notifications` collection once (the bell then
shows it again on demand). Add a document in the Firebase console, in `notifications`:

| Field | Type | Value |
|---|---|---|
| `id` | string | one that sorts after the latest notification's `id` (the app orders them as **strings**, so `"10"` comes before `"9"`; check the current latest first) |
| `isActive` | boolean | `true` |
| `title` | string | `ختمات رمضان` |
| `text` | string | `اقترب رمضان. اجمعوا أهلكم وأصدقاءكم على ختم القرآن: ختمة واحدة خلال الشهر، أو ختمة كاملة كل يوم تبدأ وحدها ويتنقّل فيها كل مشارك بين الأجزاء. شاركوا الرابط في مجموعاتكم، ومن دلّ على خير فله مثل أجر فاعله.` |
| `actions` | array of maps | `[{ text: "ختمة واحدة خلال رمضان", url: "/new?type=onetime&purpose=ramadan&from=notification_ramadan" }, { text: "ختمة كاملة كل يوم", url: "/new?type=recurring&template=ramadan-daily&from=notification_ramadan" }]` |

`from=notification_ramadan` reaches `group_created.source`, so the notification's effect shows in analytics. After
Ramadan, set `isActive` to `false`.

## 2. A message to forward on WhatsApp

For khitma.net's own channels, and for admins of last year's Ramadan groups to forward:

```
اقترب رمضان 🌙
اجمعوا أهلكم وأصدقاءكم على ختم القرآن الكريم في رمضان، مجانًا ودون تسجيل:

📖 ختمة واحدة خلال الشهر:
https://khitma.net/new?type=onetime&purpose=ramadan&from=whatsapp_ramadan

🔁 ختمة كاملة كل يوم، تبدأ وحدها ويتنقّل فيها كل مشارك بين الأجزاء:
https://khitma.net/new?type=recurring&template=ramadan-daily&from=whatsapp_ramadan

«مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ» (رواه مسلم)
```

The guide https://khitma.net/guide/ramadan-group-khitma/ explains both ways, for anyone who asks.
