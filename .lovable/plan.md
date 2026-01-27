
# خطة الترجمة الكاملة للعربية + تنسيق رأس الجدول

## ملخص المهام

بناءً على الصور المرفقة، هناك مجموعتان من التغييرات المطلوبة:

| المجموعة | الصور | الوصف |
|----------|-------|-------|
| **A) ترجمة الصفحات** | 010-015 | صفحات تسجيل الدخول، اختيار الدور، إنشاء ملف العيادة |
| **B) تنسيق الجدول** | 016 | جعل العناوين Bold مع خلفية مميزة لرأس الجدول |

---

## الجزء A: الترجمة الكاملة للعربية

### 1. صفحة تسجيل الدخول / إنشاء حساب (صور 010، 011)
**الملف:** `src/pages/Auth.tsx`

| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Welcome back | أهلاً بعودتك |
| Sign in to continue to your dashboard | سجّل الدخول للمتابعة إلى لوحة التحكم |
| Create your account | إنشاء حسابك |
| Start managing your equestrian business today | ابدأ بإدارة أعمال الفروسية الخاصة بك اليوم |
| Full Name | الاسم الكامل |
| Enter your full name | أدخل اسمك الكامل |
| Email Address | البريد الإلكتروني |
| Enter your email | أدخل بريدك الإلكتروني |
| Password | كلمة المرور |
| Enter your password | أدخل كلمة المرور |
| Forgot password? | نسيت كلمة المرور؟ |
| Sign In | تسجيل الدخول |
| Create Account | إنشاء حساب |
| Don't have an account? Sign up | ليس لديك حساب؟ سجّل الآن |
| Already have an account? Sign in | لديك حساب بالفعل؟ سجّل الدخول |
| Creating account... | جاري إنشاء الحساب... |
| Signing in... | جاري تسجيل الدخول... |
| By continuing, you agree to our | بالمتابعة، أنت توافق على |
| Terms of Service | شروط الخدمة |
| Privacy Policy | سياسة الخصوصية |
| and | و |

### 2. صفحة اختيار الدور (صورة 012)
**الملف:** `src/pages/SelectRole.tsx`

| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| What describes you best? | ما الذي يصفك بشكل أفضل؟ |
| Select all roles that apply... | حدد جميع الأدوار المناسبة لك. يمكنك دائماً إضافة المزيد لاحقاً أو الانضمام لمنشآت إضافية. |
| Horse Owner | مالك خيل |
| I own one or more horses... | أمتلك خيلاً أو أكثر وأرغب في إدارة صحتهم ورعايتهم. |
| Stable Owner | مالك إسطبل |
| I own or manage a stable... | أمتلك أو أدير إسطبلاً وأحتاج لإدارة الخيول والموظفين والعملاء. |
| Veterinarian | طبيب بيطري |
| I provide veterinary services... | أقدم خدمات بيطرية وأحتاج لإدارة الحالات والسجلات. |
| Lab Owner / Staff | مالك/موظف مختبر |
| I work in a laboratory... | أعمل في مختبر وأحتاج لإدارة العينات ونتائج الفحوصات. |
| Trainer / Academy | مدرب / أكاديمية |
| I provide training services... | أقدم خدمات تدريب وأدير الطلاب والدروس. |
| Employee | موظف |
| I work at a stable, clinic... | أعمل في إسطبل أو عيادة أو منشأة فروسية أخرى. |
| Continue | متابعة |
| role selected / roles selected | دور محدد / أدوار محددة |

### 3. صفحة إنشاء ملف العيادة (صور 013، 014، 015)
**الملف:** `src/pages/CreateStableProfile.tsx`

**عنوان الصفحة والخطوات:**
| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Create Your Clinic Profile | إنشاء ملف العيادة |
| Create Your Stable Profile | إنشاء ملف الإسطبل |
| Create Your Laboratory Profile | إنشاء ملف المختبر |
| Create Your Academy Profile | إنشاء ملف الأكاديمية |
| Veterinary clinic management | إدارة العيادة البيطرية |
| Basic Info | المعلومات الأساسية |
| Location | الموقع |
| Contact | التواصل |

**الخطوة 1 - المعلومات الأساسية:**
| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Basic Information | المعلومات الأساسية |
| Start with your clinic's name and description | ابدأ باسم عيادتك ووصفها |
| Upload your clinic logo | ارفع شعار عيادتك |
| Clinic Name * | اسم العيادة * |
| Enter your clinic name | أدخل اسم عيادتك |
| Description | الوصف |
| Tell us about your clinic, facilities... | أخبرنا عن عيادتك ومرافقها وخدماتها... |
| Horse Capacity | سعة الخيول |
| Maximum number of horses | الحد الأقصى لعدد الخيول |

**الخطوة 2 - الموقع:**
| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Location Details | تفاصيل الموقع |
| Help clients find your clinic | ساعد العملاء في العثور على عيادتك |
| Street Address * | عنوان الشارع * |
| Enter your street address | أدخل عنوان الشارع |
| City * | المدينة * |
| City | المدينة |
| Country * | البلد * |
| Saudi Arabia | المملكة العربية السعودية |
| Map integration coming soon | تكامل الخريطة قريباً |

**الخطوة 3 - التواصل:**
| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Contact Information | معلومات التواصل |
| How can people reach you? | كيف يمكن للناس التواصل معك؟ |
| Phone Number * | رقم الهاتف * |
| Business Email * | البريد الإلكتروني التجاري * |
| Website (Optional) | الموقع الإلكتروني (اختياري) |

**الأزرار:**
| النص الإنجليزي | الترجمة العربية |
|----------------|-----------------|
| Back | رجوع |
| Continue | متابعة |
| Complete Setup | إكمال الإعداد |
| Creating... | جاري الإنشاء... |

---

## الجزء B: تنسيق رأس الجدول (صورة 016)

### التغييرات المطلوبة
**الملف:** `src/components/ui/table.tsx`

1. **جعل العناوين Bold:** إضافة `font-bold` أو `font-semibold` لـ `TableHead`
2. **خلفية مميزة لرأس الجدول:** إضافة `bg-muted/50` أو `bg-muted` لـ `TableHeader`

**الكود الحالي:**
```typescript
const TableHeader = React.forwardRef<...>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
  ),
);

const TableHead = React.forwardRef<...>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-center align-middle font-medium text-muted-foreground...",
        className,
      )}
      {...props}
    />
  ),
);
```

**الكود الجديد:**
```typescript
const TableHeader = React.forwardRef<...>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-muted/50 [&_tr]:border-b", className)} {...props} />
  ),
);

const TableHead = React.forwardRef<...>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-center align-middle font-semibold text-foreground...",
        className,
      )}
      {...props}
    />
  ),
);
```

---

## الملفات المطلوب تعديلها

| الملف | التغييرات |
|-------|----------|
| `src/pages/Auth.tsx` | إضافة i18n لجميع النصوص |
| `src/pages/SelectRole.tsx` | إضافة i18n للأدوار والعناوين |
| `src/pages/CreateStableProfile.tsx` | إضافة i18n لجميع خطوات الإنشاء |
| `src/components/ui/table.tsx` | تنسيق رأس الجدول (Bold + خلفية) |
| `src/i18n/locales/en.ts` | إضافة ~60 مفتاح جديد |
| `src/i18n/locales/ar.ts` | إضافة الترجمات العربية |

---

## المفاتيح الجديدة (ملخص)

**~60 مفتاح جديد تحت:**
```text
auth.*: signIn, signUp, welcomeBack, createAccount, emailLabel, passwordLabel, 
        fullNameLabel, enterEmail, enterPassword, enterFullName, forgotPassword,
        signingIn, creatingAccount, noAccount, hasAccount, termsAgreement, 
        termsOfService, privacyPolicy, startManaging, signInToContinue

selectRole.*: title, subtitle, continue, roleSelected, rolesSelected,
              horseOwner, horseOwnerDesc, stableOwner, stableOwnerDesc,
              veterinarian, veterinarianDesc, labOwner, labOwnerDesc,
              trainer, trainerDesc, employee, employeeDesc

createProfile.*: createYourProfile, steps.basicInfo, steps.location, steps.contact,
                 basicInformation, startWithName, uploadLogo, nameLabel, 
                 enterName, description, descriptionPlaceholder, horseCapacity,
                 maxHorses, locationDetails, helpClientsFind, streetAddress,
                 enterStreetAddress, city, country, saudiArabia, mapComingSoon,
                 contactInformation, howCanPeopleReach, phoneNumber, businessEmail,
                 websiteOptional, completeSetup, creating

createProfile.tenantTypes.*: stable, stableDesc, clinic, clinicDesc, 
                             lab, labDesc, academy, academyDesc
```

---

## معايير القبول

| الاختبار | النتيجة المتوقعة |
|----------|-----------------|
| صفحة تسجيل الدخول بالعربي | جميع النصوص بالعربية بدون أي إنجليزي |
| صفحة إنشاء حساب بالعربي | جميع النصوص بالعربية |
| صفحة اختيار الدور بالعربي | الأدوار والأوصاف بالعربية |
| صفحة إنشاء العيادة بالعربي | جميع الخطوات والحقول بالعربية |
| رأس جدول الخيول | عناوين Bold + خلفية رمادية خفيفة مميزة |
| التوافق مع LTR | النصوص الإنجليزية تعمل بشكل صحيح |
