
# خطة ترجمة الصفحة الرئيسية + إضافة محوّل اللغة

## ملخص المهمة

ترجمة جميع نصوص الصفحة الرئيسية (Landing Page) للعربية مع إضافة خيار اختيار اللغة في شريط التنقل.

---

## الجزء الأول: إضافة محوّل اللغة في شريط التنقل

### التغييرات في Navbar.tsx

**الموقع:** بجانب أزرار "Sign In" و "Get Started"

**المتطلبات:**
1. استيراد `LanguageSelector` من `@/components/ui/language-selector`
2. إضافة نسخة مخصصة للصفحة الرئيسية تدعم الخلفية الشفافة (variant="hero")
3. إضافة المحوّل في القائمة المحمولة أيضاً

**الكود المقترح:**
```typescript
// Desktop: بين الروابط والأزرار
<div className="hidden md:flex items-center gap-8">
  <NavLinks variant={isHome ? "light" : "default"} />
  <div className="flex items-center gap-3">
    <LanguageSelector variant={isHome ? "hero" : "default"} />
    <Button variant={isHome ? "hero-outline" : "ghost"}>...</Button>
    ...
  </div>
</div>

// Mobile: في نهاية القائمة
<LanguageSelector variant="default" />
```

### تحديث LanguageSelector لدعم variant

إضافة prop جديد `variant` لتغيير الألوان حسب الخلفية:

| Variant | الاستخدام | الألوان |
|---------|----------|---------|
| `default` | الصفحات العادية | `bg-white/50 border-border/30` |
| `hero` | الصفحة الرئيسية (خلفية داكنة) | `bg-cream/10 border-cream/30 text-cream` |

---

## الجزء الثاني: ترجمة جميع المكونات

### 1. شريط التنقل (Navbar.tsx)

| النص الإنجليزي | الترجمة العربية | المفتاح |
|----------------|-----------------|---------|
| Features | المميزات | `landing.nav.features` |
| Directory | الدليل | `landing.nav.directory` |
| Solutions | الحلول | `landing.nav.solutions` |
| Pricing | الأسعار | `landing.nav.pricing` |
| Sign In | تسجيل الدخول | `landing.nav.signIn` |
| Get Started | ابدأ الآن | `landing.nav.getStarted` |

### 2. قسم البطل (HeroSection.tsx)

| النص الإنجليزي | الترجمة العربية | المفتاح |
|----------------|-----------------|---------|
| Launching in Saudi Arabia & Gulf Region | ننطلق في المملكة العربية السعودية ومنطقة الخليج | `landing.hero.badge` |
| The Future of | مستقبل | `landing.hero.titlePart1` |
| Horse Management | إدارة الخيل | `landing.hero.titleHighlight` |
| is Here | بين يديك | `landing.hero.titlePart2` |
| A complete ecosystem for stables... | منظومة متكاملة للإسطبلات والعيادات والمختبرات والأكاديميات. أدِر خيولك، تواصل مع المحترفين، ونمِّ أعمال الفروسية. | `landing.hero.subtitle` |
| Start Free Trial | ابدأ تجربتك المجانية | `landing.hero.startTrial` |
| Watch Demo | شاهد العرض | `landing.hero.watchDemo` |
| Horses Managed | خيل تحت الإدارة | `landing.hero.statHorses` |
| Stables | إسطبل | `landing.hero.statStables` |
| Satisfaction | رضا العملاء | `landing.hero.statSatisfaction` |

### 3. قسم المميزات (FeaturesSection.tsx)

**العنوان:**
| النص الإنجليزي | الترجمة العربية | المفتاح |
|----------------|-----------------|---------|
| Powerful Features | مميزات قوية | `landing.features.badge` |
| Everything You Need to | كل ما تحتاجه | `landing.features.titlePart1` |
| Excel | للتميز | `landing.features.titleHighlight` |
| A comprehensive suite... | مجموعة شاملة من الأدوات المصممة لصناعة الفروسية الحديثة، من ملاك الخيول الأفراد إلى العمليات الكبيرة. | `landing.features.subtitle` |

**المميزات (8 عناصر):**
| الميزة (EN) | العنوان (AR) | الوصف (AR) |
|-------------|--------------|------------|
| Stable Management | إدارة الإسطبل | جرد كامل للخيول، السجلات الصحية، جداول التغذية، وإدارة الموظفين. |
| Clinic & Veterinary | العيادة البيطرية | إدارة الحالات الرقمية، تتبع العلاج، والاستشارات البيطرية. |
| Laboratory Services | خدمات المختبر | تتبع العينات، إدارة نتائج الفحوصات، وإنشاء التقارير. |
| Training Academy | أكاديمية التدريب | تسجيل الطلاب، جدولة الدروس، وتتبع التقدم. |
| Transport Services | خدمات النقل | حجز نقل الخيول، تخطيط المسارات، وإدارة المركبات. |
| Auctions | المزادات | مزادات الخيول عبر الإنترنت، نظام المزايدة، وإدارة المعاملات. |
| Multi-Tenant System | نظام متعدد المنشآت | إدارة منشآت متعددة مع صلاحيات وأدوار مخصصة. |
| Multi-Language | متعدد اللغات | دعم العربية والإنجليزية والأردية والهندية والبنغالية والفلبينية. |

### 4. قسم الحلول (Index.tsx - SolutionsSection)

**العنوان:**
| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Built For Everyone | مصمم للجميع |
| Solutions for Every Role | حلول لكل الأدوار |
| Whether you own a single horse... | سواء كنت تملك خيلاً واحداً أو تدير عملية كبيرة، خيل يتكيف مع احتياجاتك. |

**البطاقات:**
| البطاقة | العنوان | الوصف | العناصر |
|---------|---------|-------|---------|
| Horse Owners | ملاك الخيل | تتبع صحة خيلك، جدولة الزيارات البيطرية، والتواصل مع الخدمات المحلية. | السجلات الصحية، جدولة البيطري، تتبع المصروفات، الوصول للمجتمع |
| Stable Owners | ملاك الإسطبلات | أدِر عمليتك بالكامل من الإيواء إلى الموظفين إلى المالية. | إدارة الإيواء، جدولة الموظفين، الفواتير، بوابة العملاء |
| Veterinarians | الأطباء البيطريون | بسّط ممارستك مع إدارة الحالات والسجلات الرقمية. | إدارة الحالات، السجلات الرقمية، تكامل المختبر، التواصل مع العملاء |

### 5. قسم الأسعار (PricingSection.tsx)

**العنوان:**
| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Simple Pricing | أسعار بسيطة |
| Choose Your Plan | اختر خطتك |
| Flexible pricing... | أسعار مرنة تتناسب مع احتياجاتك. ابدأ مجاناً وترقَّ مع نموك. |
| Most Popular | الأكثر شعبية |
| /month | /شهرياً |

**الخطط:**
| الخطة | الاسم | الوصف | المميزات |
|-------|-------|-------|----------|
| Starter | مبتدئ | مثالية لملاك الخيل الأفراد | حتى 3 خيول، سجلات صحية أساسية، الوصول للتطبيق، ميزات المجتمع |
| Stable | إسطبل | للإسطبلات الصغيرة والمتوسطة | حتى 50 خيل، إدارة الموظفين، التقارير المالية، تكامل العيادة، دعم ذو أولوية |
| Enterprise | المؤسسات | للعمليات الكبيرة والأعمال التجارية | خيول غير محدودة، دعم متعدد المواقع، تكاملات مخصصة، مدير حساب مخصص، ضمان SLA، خيارات العلامة البيضاء |

**أزرار CTA:**
| الخطة | النص الإنجليزي | الترجمة العربية |
|-------|----------------|-----------------|
| Starter | Get Started | ابدأ الآن |
| Stable | Start Free Trial | ابدأ تجربتك المجانية |
| Enterprise | Contact Sales | تواصل مع المبيعات |

### 6. قسم الدعوة للإجراء (CTASection)

| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Ready to Transform Your | جاهز لتحويل |
| Equestrian Business | أعمال الفروسية الخاصة بك |
| Join thousands of horse owners... | انضم لآلاف ملاك الخيل والإسطبلات والأطباء البيطريين الذين يثقون بخيل لإدارة عملياتهم. ابدأ تجربتك المجانية اليوم. |
| Start Free Trial | ابدأ تجربتك المجانية |
| Schedule Demo | احجز عرضاً توضيحياً |

### 7. التذييل (Footer.tsx)

| النص الإنجليزي | الترجمة العربية | المفتاح |
|----------------|-----------------|---------|
| The complete ecosystem... | المنظومة المتكاملة لإدارة الخيل الحديثة. صُممت لمنطقة الخليج، جاهزة للعالم. | `landing.footer.description` |
| Platform | المنصة | `landing.footer.platform` |
| Features | المميزات | `landing.footer.features` |
| Pricing | الأسعار | `landing.footer.pricing` |
| Solutions | الحلول | `landing.footer.solutions` |
| Mobile App | تطبيق الجوال | `landing.footer.mobileApp` |
| Company | الشركة | `landing.footer.company` |
| About Us | من نحن | `landing.footer.aboutUs` |
| Careers | الوظائف | `landing.footer.careers` |
| Contact | تواصل معنا | `landing.footer.contact` |
| Blog | المدونة | `landing.footer.blog` |
| Support | الدعم | `landing.footer.support` |
| Help Center | مركز المساعدة | `landing.footer.helpCenter` |
| Documentation | الوثائق | `landing.footer.documentation` |
| API Reference | مرجع API | `landing.footer.apiReference` |
| Status | الحالة | `landing.footer.status` |
| All rights reserved | جميع الحقوق محفوظة | `landing.footer.rights` |
| Privacy Policy | سياسة الخصوصية | `landing.footer.privacy` |
| Terms of Service | شروط الخدمة | `landing.footer.terms` |

---

## الجزء الثالث: دعم RTL

### التعديلات المطلوبة

1. **HeroSection.tsx:**
   - تغيير `ArrowRight` إلى `ArrowLeft` في RTL
   - استخدام logical properties للـ margins

2. **جميع المكونات:**
   - إضافة `useI18n` hook
   - استخدام `dir` للتحقق من اتجاه النص

---

## الملفات المطلوب تعديلها

| الملف | التغييرات |
|-------|----------|
| `src/components/ui/language-selector.tsx` | إضافة prop `variant` للتوافق مع الخلفيات المختلفة |
| `src/components/Navbar.tsx` | إضافة `LanguageSelector` + i18n للروابط والأزرار |
| `src/components/HeroSection.tsx` | إضافة i18n + RTL للأيقونات |
| `src/components/FeaturesSection.tsx` | تحويل المميزات إلى i18n |
| `src/pages/Index.tsx` | ترجمة SolutionsSection و CTASection |
| `src/components/PricingSection.tsx` | تحويل الخطط إلى i18n |
| `src/components/Footer.tsx` | إضافة i18n للروابط والنصوص |
| `src/i18n/locales/en.ts` | إضافة ~105 مفتاح جديد تحت `landing.*` |
| `src/i18n/locales/ar.ts` | إضافة الترجمات العربية |

---

## هيكل المفاتيح الجديدة

```text
landing:
  nav:
    features, directory, solutions, pricing, signIn, getStarted

  hero:
    badge, titlePart1, titleHighlight, titlePart2, subtitle
    startTrial, watchDemo
    statHorses, statStables, statSatisfaction

  features:
    badge, titlePart1, titleHighlight, subtitle
    stable: { title, desc }
    clinic: { title, desc }
    lab: { title, desc }
    academy: { title, desc }
    transport: { title, desc }
    auctions: { title, desc }
    multiTenant: { title, desc }
    multiLang: { title, desc }

  solutions:
    badge, titlePart1, titleHighlight, subtitle
    owners: { title, desc, items: [...] }
    stables: { title, desc, items: [...] }
    vets: { title, desc, items: [...] }

  pricing:
    badge, titlePart1, titleHighlight, subtitle, popular, perMonth
    starter: { name, desc, features: [...], cta }
    stable: { name, desc, features: [...], cta }
    enterprise: { name, desc, features: [...], cta }

  cta:
    titlePart1, titleHighlight, subtitle, startTrial, scheduleDemo

  footer:
    description, platform, features, pricing, solutions, mobileApp
    company, aboutUs, careers, contact, blog
    support, helpCenter, documentation, apiReference, status
    rights, privacy, terms
```

---

## معايير القبول

| الاختبار | النتيجة المتوقعة |
|----------|-----------------|
| محوّل اللغة في Navbar | يظهر بجانب أزرار الدخول ويعمل بشكل صحيح |
| تغيير اللغة للعربية | جميع نصوص الصفحة تتحول للعربية |
| اتجاه RTL | الصفحة تعرض بشكل صحيح من اليمين لليسار |
| الأيقونات | ArrowRight تتحول لـ ArrowLeft في العربية |
| التوافق مع Mobile | القائمة المحمولة تعرض محوّل اللغة |
| التوافق مع LTR | الإنجليزية تعمل بشكل طبيعي |
