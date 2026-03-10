
INSERT INTO public.permission_definitions (key, display_name, display_name_ar, module, resource, action, description)
VALUES
  ('boarding.admission.create', 'Create boarding admissions', 'إنشاء إيواء', 'boarding', 'admission', 'create', 'Create new boarding admissions'),
  ('boarding.admission.view', 'View boarding admissions', 'عرض الإيواء', 'boarding', 'admission', 'view', 'View boarding admissions'),
  ('boarding.admission.update', 'Update boarding admissions', 'تعديل الإيواء', 'boarding', 'admission', 'update', 'Update boarding admission details'),
  ('boarding.admission.checkout', 'Checkout boarding admissions', 'إخراج الإيواء', 'boarding', 'admission', 'checkout', 'Check out horses from boarding'),
  ('boarding.checkout.override_balance', 'Override balance on checkout', 'تجاوز الرصيد عند الإخراج', 'boarding', 'checkout', 'override_balance', 'Override outstanding balance check during checkout')
ON CONFLICT (key) DO NOTHING;
