

# إضافة إطار لوني حول زر X في Dialog

## ما فهمته

في الصورة، زر الإغلاق (X) في نافذة "Service Capabilities" يظهر بإطار دائري ملوّن حوله. هذا التصميم موجود بالفعل في مكون `Sheet` (الأيقونة `rounded-md border border-border p-1.5`). لكن مكون `Dialog` لا يملك هذا الإطار — الزر فقط `rounded-sm` بدون حدود أو padding.

المطلوب: توحيد التصميم بتطبيق نفس الإطار اللوني على زر X في `Dialog` ليتطابق مع `Sheet`.

## التغيير

### ملف واحد: `src/components/ui/dialog.tsx` (سطر 48-51)

تغيير كلاسات زر الإغلاق من:
```
rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none
```

إلى (مطابق لـ Sheet):
```
rounded-md border border-border p-1.5 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary
```

الفرق:
- `rounded-sm` → `rounded-md`
- إضافة `border border-border p-1.5`
- `data-[state=open]:bg-accent data-[state=open]:text-muted-foreground` → `data-[state=open]:bg-secondary`

هذا يؤثر على جميع الـ Dialogs في المنصة بالكامل من مكان واحد (UI primitive)، بدون أي ديون تقنية.

