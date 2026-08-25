# تصنيف إخفاقات اختبارات Fog — 2026-08-25

## النطاق والمنهج

- العمل والفحص داخل مستودع `fog` فقط؛ استُخدم `qappan` مرجعًا للقراءة والتشغيل دون أي تعديل.
- شُغّل كل اختبار فاشل منفردًا، وقُرئت ملفات الاختبارات الـ22 كاملة (1,501 سطرًا)، ثم قورنت شروطها بالمصدر الفعلي.
- شُغّلت الاختبارات نفسها داخل `qappan`: تكرر 21 إخفاقًا بالرسالة الأولى نفسها. الاختبار الوحيد الذي ينجح هناك ويفشل في Fog هو `permissions-gnss-adhan-cycle.test.js` بسبب تثبيته النصي على إصدار Service Worker القديم `r1` بينما Fog أصبح `r5`.
- عند وجود أكثر من شرط محجوب خلف أول إخفاق، أُعيد تنفيذ نسخة ذاكرية مؤقتة من الاختبار مع تجاوز الشرط الأول فقط لكشف الشروط التالية؛ لم يُكتب أو يُعدّل أي ملف بهذه الطريقة.
- لم يُعدّل أي ملف من ملفات التحقق الفلكي أو معادلاته أو دورة الالتقاط.

## الخلاصة العددية

| الفئة | العدد | القرار |
|---|---:|---|
| تثبيت قديم لاسم/رقم إصدار Service Worker فقط | 7 | تحديث الاختبار لاحقًا إلى عقد دلالي؛ لا تُرجع إصدار الإنتاج للخلف |
| نقص حقيقي في التخزين المسبق لمسار التحقق الفلكي | 3 | مهمة PWA منفصلة؛ تعديل قائمة Service Worker فقط بعد موافقة صريحة |
| عقد معماري/نصي قديم لا يطابق المالك الحالي | 6 | ترحيل الاختبار بعد اعتماد المالك الحالي؛ لا يُعالج بتغيير الحسابات |
| تعارض مع سلوك التحقق الفلكي المحمي | 6 | مجمّد في هذه المرحلة؛ يحتاج قرارًا علميًا/منتجيًا مستقلًا |
| **المجموع** | **22** | **لا يوجد مبرر لتغيير المعادلات أو دورة التحقق أثناء التنظيف** |

## الجرد التفصيلي

| # | الاختبار | الدليل الحالي | التصنيف والقرار |
|---:|---|---|---|
| 1 | `tests/astronomical-app-wiring.test.js` | كل شروط الربط السابقة تمر، ثم يفشل السطر 65 لأن Service Worker لا يحتوي `./js/astronomical-trace.js`. | نقص offline حقيقي. يُعالج في قائمة cache فقط ضمن مرحلة PWA مستقلة. |
| 2 | `tests/astronomical-qibla-semantic-mapping.test.js` | شروط الفصل بين Qibla وcamera heading تمر؛ الفشل الوحيد المباشر هو regex يفرض `qiblaastro-v5.*` بينما الإصدار الحالي `qiblaastro-3.1.0-*`. | تثبيت إصدار قديم. يُحدّث الاختبار، لا المصدر الفلكي. |
| 3 | `tests/astronomical-verification-session.test.js` | يفشل أولًا عند شرط `v5`، ثم يطلب أسماء تنفيذ قديمة `isNavigation` و`networkFirst`. Service Worker الحالي يطبق network-first مباشرة عبر `fetch(...no-store)` ويفصل navigation بـ`r.mode==='navigate'`. | عقد معماري قديم لـService Worker؛ يلزم قرار ترحيل الاختبار، وليس تغيير session. |
| 4 | `tests/capture-finalization-deadlock.test.js` | شرطان إنهاء الالتقاط يمران؛ يفشل فقط لأنه يطلب حرفيًا `qiblaastro-v5.14-capture-finalization-fix` وبصيغة مسافات محددة. | تثبيت إصدار تاريخي فقط. |
| 5 | `tests/field-test-readiness.test.js` | يفشل عند أول أصل غير مخزن: `js/astro-verification.js`. من stack الديناميكي ذي 17 أصلًا لا يُخزن حاليًا إلا store؛ 16 أصلًا ديناميكيًا مفقودًا من precache. | نقص offline حقيقي؛ يعالج منفصلًا في Service Worker. |
| 6 | `tests/index/inline-runtime-contract.test.js` | يطلب hash قديمًا `7fb224...` لكتلة موصوفة بأنها 185KB. الكتلة الحالية الوحيدة 78,959 بايت وSHA-256=`a15cd61bd896c7bfcef1c40c0bd91ffca4cf8d4c02a4a89f4cdd016dd3cccb19` بعد التنظيف المعتمد. | حارس hash قديم يحتاج migration لعقد الوظائف الحية بدل تجميد ملف كامل. |
| 7 | `tests/isolated-capture-pipeline.test.js` | يرفض وجود `alignmentReady` ويطلب التقاطًا خامًا بلا Qibla alignment، بينما UI الحالي يبوّب الالتقاط بـ`alignmentReady`. | تعارض فلكي محمي؛ يتناقض صراحة مع الاختبارات 15 و21 و22. لا تعديل. |
| 8 | `tests/native-android-localization-security.test.js` | بعد تجاوز شرطي الإصدار `v*` و`v6.16` ذاكرّيًا يمر الاختبار كاملًا، بما فيه أمن token والجداول والإشعارات والجسر offline. | تثبيتان قديمان لإصدار Service Worker فقط. |
| 9 | `tests/permissions-gnss-adhan-cycle.test.js` | يطلب حرفيًا `qiblaastro-3.1.0-code3-location-only-r1`. Fog يستخدم `r5` بعد تغييرات cache، مع بقاء `PERMISSIONS_RELEASE` نفسه؛ بقية الاختبار تمر. ينجح في qappan ذي `r1`. | إخفاق Fog الوحيد غير الموروث؛ الاختبار هو القديم، ولا ينبغي التراجع عن cache generation. |
| 10 | `tests/post-verification-live-compass-isolation.test.js` | الوحدة المعزولة نفسها تمر، لكن `qibla-card-runtime.js` يحمّلها ولا يستهلك live heading. بعد تجاوز شرط النص، تبقى بطاقة body فارغة بدل `البوصلة الشمسية`. كما أن الوحدة غير موجودة في precache. | تعارض/فجوة تكامل فلكي-عرض موروثة ومحميّة؛ تحتاج مهمة مستقلة، لا تنظيفًا. |
| 11 | `tests/pre-native-release-readiness.test.js` | يفشل شرطان lexical: يتوقع newline بعد `finish('granted')` ومتغيرًا محذوفًا `notificationResult`. التنفيذ الحالي يمنح فقط عند success ويضع notifications=`contextual` بلا prompt؛ بعد تجاوز الشرطين يمر الاختبار كاملًا. | اختبار نصي هش؛ تُحدّث regex/assertions لاحقًا دون تغيير السلوك. |
| 12 | `tests/presentation/astronomical-verification-offline-shell.test.js` | يحلل stack الفعلي ويجد أولًا `astronomical-trace.js` مفقودًا؛ الجرد الكامل يثبت غياب 16 من 17 أصلًا ديناميكيًا، ثم يفرض إصدارًا تاريخيًا `v5.55`. | نقص offline حقيقي مع شرط إصدار قديم ثانوي. |
| 13 | `tests/presentation/falaki-standalone-contract.test.js` | الصفحة والمضيف وcache يمران؛ الاختبار يطلب أن يحمّل `qibla-card-runtime.js` فلكي، بينما المالك الحالي هو `presentation/bootstrap.js::loadFalaki()`. بعد تصحيح المالك ذاكرّيًا لا يبقى إلا regex الإصدار القديم. | عقد ملكية loader قديم؛ bootstrap هو المالك الحالي. |
| 14 | `tests/presentation/prayer-adhan-contract.test.js` | بعد تجاوز regex `qiblaastro-v*` يمر الاختبار كاملًا: الملفات الصوتية المحلية، finalizer، UI وCSS كلها سليمة. | تثبيت صيغة إصدار قديمة فقط. |
| 15 | `tests/proven-observation-layer.test.js` | يطلب صياغة قديمة `alignmentRequired===false||...` و`latestResult.qiblaAlignment` لا توجد في التنفيذ الحالي الذي يعتمد canonical observation. | تعارض فلكي محمي، كما يتعارض مع الاختبار 7. لا تعديل. |
| 16 | `tests/pwa-standalone-readiness.test.js` | يفرض الاسمين القديمين `OFFLINE_URL` و`APP_SHELL`. التنفيذ الحالي يستخدم `CRITICAL_PRESENTATION` ويعيد cached `index.html` للتنقل عند انقطاع الشبكة. | اختلاف سياسة/بنية PWA؛ يجب اعتماد سياسة fallback ثم ترحيل الاختبار، وليس حذف كود عشوائي. |
| 17 | `tests/qibla-card-runtime.test.js` | يمنع مجرد ذكر `QiblaAstronomicalVerificationStore`. الذكر الحالي موجود فقط كي لا يُحمّل store مرتين ثم يحمّله للقراءة؛ لا توجد `.record()` أو معادلة. بعد تجاوز هذا token وحده يمر الاختبار كاملًا. | حاجز معماري قديم؛ يستبدل لاحقًا بحظر الكتابة/الحساب الفعلي لا اسم API. |
| 18 | `tests/raw-observation-direct-capture.test.js` | يطلب `observedQiblaBearingDeg:heading`، بينما session الحالي يحفظ Qibla المحلولة منفصلة عن camera heading. | تعارض دلالي فلكي محمي؛ يتعارض مع semantic-mapping والـstore الحالي. لا تعديل. |
| 19 | `tests/record-contract-mismatch.test.js` | شروط قبول/تطبيع alignment mode تمر؛ الفشل عند regex يفرض بادئة `qiblaastro-v`. | تثبيت صيغة إصدار قديمة فقط. |
| 20 | `tests/record-display-e2e.test.js` | مسار record → store → cards → DOM يمر حتى آخر assertion؛ الفشل الوحيد هو اشتراط `qiblaastro-v5.*`. | تثبيت إصدار قديم فقط. |
| 21 | `tests/reticle-capture-handshake.test.js` | يطلب مرحلة `ALIGN_QIBLA` وطريقة `astronomical-relative-yaw` وتعليمات تدوير ثنائية المرحلة، وهي ليست العقد الحالي. | تعارض فلكي محمي ويتناقض مع الاختبار 7 و18. لا تعديل. |
| 22 | `tests/single-reticle-auto-capture.test.js` | يطلب وضع target من `alignmentTarget` بصياغة قديمة، بينما UI الحالي يثبت target في المركز أثناء align phase. | تعارض فلكي/واجهة رصد محمي. لا تعديل. |

## علاقة Fog بمرجع qappan

- جميع ملفات حدود التحقق الفلكي المحمية الثمانية عشر متطابقة بايتًا بين Fog وqappan، ومنها session وobservatory UI وstore وCSS المرصد؛ كما أن `js/qibla-card-runtime.js` متطابق بين المستودعين.
- 21 من 22 إخفاقًا تتكرر داخل qappan قبل أي تنظيف Fog.
- الإخفاق الإضافي الوحيد سببه أن اختبار permissions يثبت cache generation `r1`، بينما كان لزامًا تغيير generation في Fog لمنع بقاء أصول القشرة القديمة في cache.
- لذلك لا يجوز علاج مجموعة الإخفاقات بتغيير qappan أو نسخ دورة تحقق أخرى أو تعديل المعادلات.

## القرار التنفيذي

1. لا تعديل على الفئة الفلكية المحمية (6 اختبارات).
2. لا رجوع بإصدار Service Worker لإرضاء 7 اختبارات قديمة.
3. تُجمع تحديثات الاختبارات الدلالية الستة في مرحلة test-governance منفصلة.
4. تُناقش إضافة stack التحقق الكامل إلى precache كمرحلة PWA مستقلة؛ هذه هي الفجوة التشغيلية المؤكدة الوحيدة المتكررة في ثلاثة اختبارات.
