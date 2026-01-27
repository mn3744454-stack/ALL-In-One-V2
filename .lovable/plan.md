
# خطة تنفيذ المستوى 2: إصلاح معرض الوسائط مع Lightbox

## ملخص المشكلة

| العنصر | الوضع الحالي |
|--------|-------------|
| Bucket `horse-media` | خاص (private) |
| الصور القديمة | URLs كاملة - تعمل |
| الصور الجديدة | مسارات Storage فقط - لا تعمل |
| كود العرض | `<img src={url}>` مباشرة بدون Signed URL |
| صلاحية الوسائط | `horses.media.manage` موجودة |

---

## الملفات المطلوب إنشاؤها/تعديلها

| الملف | العملية | الوصف |
|-------|---------|-------|
| `src/components/ui/ImageLightbox.tsx` | إنشاء | مكون عرض الصور بحجم كامل مع Zoom |
| `src/components/ui/SecureVideo.tsx` | إنشاء | مكون فيديو آمن مع Signed URL |
| `src/components/horses/HorseMediaGallery.tsx` | إنشاء | معرض وسائط متكامل |
| `src/components/horses/index.ts` | تعديل | تصدير المكون الجديد |
| `src/pages/HorseProfile.tsx` | تعديل | استخدام HorseMediaGallery |
| `src/i18n/locales/ar.ts` | تعديل | إضافة ترجمات Lightbox |
| `src/i18n/locales/en.ts` | تعديل | إضافة ترجمات Lightbox |

**إجمالي التغييرات:** ~400 سطر

---

## الجزء الأول: مكون ImageLightbox.tsx (~120 سطر)

**الميزات:**
- عرض الصورة بحجم كامل في Dialog
- Zoom In / Zoom Out (مستويات: 1x, 1.5x, 2x, 2.5x, 3x)
- التنقل بين الصور (السابق/التالي)
- دعم أسهم لوحة المفاتيح
- إغلاق بالضغط على X أو الخلفية
- دعم RTL

**الواجهة:**
```text
┌────────────────────────────────────────┐
│  ✕                              ⊖  ⊕   │
├────────────────────────────────────────┤
│                                        │
│     ◀    [    صورة الخيل    ]    ▶     │
│                                        │
├────────────────────────────────────────┤
│              1 / 3                     │
└────────────────────────────────────────┘
```

**Props:**
```typescript
interface ImageLightboxProps {
  images: { url: string; alt?: string }[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

---

## الجزء الثاني: مكون SecureVideo.tsx (~60 سطر)

مكون مشابه لـ `SecureImage` للفيديوهات:
- يولد Signed URL للفيديو من bucket خاص
- يعرض video player مع controls
- Skeleton أثناء التحميل
- Fallback عند الخطأ

**Props:**
```typescript
interface SecureVideoProps {
  bucket: string;
  path: string;
  className?: string;
  expiresIn?: number;
}
```

---

## الجزء الثالث: مكون HorseMediaGallery.tsx (~150 سطر)

**الوظائف:**
1. استقبال `images[]` و `videos[]` من horse object
2. تمييز URLs الكاملة من مسارات Storage
3. عرض الصور باستخدام `SecureImage` أو `img` حسب النوع
4. عرض الفيديوهات باستخدام `SecureVideo` أو `video` حسب النوع
5. فتح Lightbox عند الضغط على أي صورة
6. التفاف بـ `PermissionGuard` لصلاحية `horses.media.manage`

**المنطق:**
```typescript
const isFullUrl = (path: string) => path.startsWith('http');

// للصور
if (isFullUrl(url)) {
  return <img src={url} ... />;
} else {
  return <SecureImage bucket="horse-media" path={url} ... />;
}
```

**Props:**
```typescript
interface HorseMediaGalleryProps {
  images?: string[] | null;
  videos?: string[] | null;
  horseName: string;
  showManageButton?: boolean; // للمستقبل - زر إدارة الوسائط
}
```

---

## الجزء الرابع: تحديث HorseProfile.tsx (~30 سطر تعديل)

**قبل:**
```jsx
{((horse.images && horse.images.length > 0) || 
  (horse.videos && horse.videos.length > 0)) && (
  <Card>
    <CardHeader>
      <CardTitle>{t('horses.profile.mediaGallery')}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid ...">
        {horse.images?.map((url, index) => (
          <img src={url} ... />
        ))}
        {horse.videos?.map((url, index) => (
          <video src={url} ... />
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

**بعد:**
```jsx
<HorseMediaGallery 
  images={horse.images}
  videos={horse.videos}
  horseName={horse.name}
/>
```

---

## الجزء الخامس: مفاتيح الترجمة الجديدة

**ar.ts:**
```typescript
horses: {
  profile: {
    // ... existing
    mediaGallery: "معرض الوسائط",
  },
  mediaGallery: {
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    close: "إغلاق",
    previous: "السابق",
    next: "التالي",
    imageOf: "صورة {current} من {total}",
    noMedia: "لا توجد وسائط",
    videoError: "تعذر تحميل الفيديو",
    imageError: "تعذر تحميل الصورة",
  }
}
```

**en.ts:**
```typescript
horses: {
  profile: {
    // ... existing
    mediaGallery: "Media Gallery",
  },
  mediaGallery: {
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    close: "Close",
    previous: "Previous",
    next: "Next",
    imageOf: "Image {current} of {total}",
    noMedia: "No media",
    videoError: "Failed to load video",
    imageError: "Failed to load image",
  }
}
```

---

## تكامل الصلاحيات

سيتم استخدام `PermissionGuard` الموجود مع صلاحية `horses.media.manage`:
- **المالك/المدير**: يرى المعرض كاملاً
- **الموظف بدون الصلاحية**: لا يرى قسم الوسائط (يُخفى بالكامل)

```jsx
<PermissionGuard 
  permissionKey="horses.records.view"
  showFallback={false}
>
  <Card>
    <CardHeader>
      <CardTitle>{t('horses.profile.mediaGallery')}</CardTitle>
    </CardHeader>
    <CardContent>
      <HorseMediaGallery ... />
    </CardContent>
  </Card>
</PermissionGuard>
```

---

## معايير القبول

| الاختبار | النتيجة المتوقعة |
|----------|------------------|
| الصور القديمة (URLs كاملة) | تظهر بشكل صحيح |
| الصور الجديدة (مسارات Storage) | تظهر بشكل صحيح |
| الضغط على صورة | يفتح Lightbox |
| Zoom In/Out | يعمل بأزرار |
| التنقل بين الصور | يعمل بالأسهم |
| الفيديوهات | تظهر مع controls |
| RTL | يعمل بشكل صحيح |
| موظف بدون صلاحية | لا يرى القسم |

---

## ملخص التنفيذ

```text
1. إنشاء ImageLightbox.tsx
2. إنشاء SecureVideo.tsx
3. إنشاء HorseMediaGallery.tsx
4. تحديث src/components/horses/index.ts
5. تحديث HorseProfile.tsx
6. تحديث ar.ts و en.ts
```
