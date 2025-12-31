-- Insert mock lab results for existing samples with different dates for comparison
-- Using CBC Template with varying values to show trends

-- Result 1: Queen - 30 days ago (normal)
INSERT INTO lab_results (
  tenant_id,
  sample_id,
  template_id,
  status,
  result_data,
  interpretation,
  flags,
  created_by,
  created_at
) VALUES (
  '61192a20-6f07-441f-8cfc-0a6584426fcd',
  'edff9789-b798-4133-bedf-dacab9e1b749',
  '4324055e-8300-4585-af7c-fa72d3a7a839',
  'final',
  '{"wbc": 7.8, "rbc": 8.9, "hemoglobin": 13.2, "hematocrit": 38.5, "platelets": 210}'::jsonb,
  '{"summary": "All parameters within normal range", "notes": "Healthy blood profile for equine"}'::jsonb,
  'normal',
  '343dc041-bd77-4926-ae2a-16897e7859a2',
  NOW() - INTERVAL '30 days'
);

-- Result 2: Queen - 20 days ago (normal)
INSERT INTO lab_results (
  tenant_id,
  sample_id,
  template_id,
  status,
  result_data,
  interpretation,
  flags,
  created_by,
  created_at
) VALUES (
  '61192a20-6f07-441f-8cfc-0a6584426fcd',
  'edff9789-b798-4133-bedf-dacab9e1b749',
  '4324055e-8300-4585-af7c-fa72d3a7a839',
  'final',
  '{"wbc": 8.5, "rbc": 9.2, "hemoglobin": 14.1, "hematocrit": 41.2, "platelets": 225}'::jsonb,
  '{"summary": "Normal values, slight improvement from previous test", "notes": "Good recovery indicators"}'::jsonb,
  'normal',
  '343dc041-bd77-4926-ae2a-16897e7859a2',
  NOW() - INTERVAL '20 days'
);

-- Result 3: Queen - 10 days ago (abnormal - high values)
INSERT INTO lab_results (
  tenant_id,
  sample_id,
  template_id,
  status,
  result_data,
  interpretation,
  flags,
  created_by,
  created_at
) VALUES (
  '61192a20-6f07-441f-8cfc-0a6584426fcd',
  'edff9789-b798-4133-bedf-dacab9e1b749',
  '4324055e-8300-4585-af7c-fa72d3a7a839',
  'final',
  '{"wbc": 12.1, "rbc": 10.1, "hemoglobin": 15.8, "hematocrit": 46.5, "platelets": 285}'::jsonb,
  '{"summary": "Elevated WBC and hemoglobin levels detected", "notes": "Possible dehydration or stress response. Recommend hydration therapy and retest in 10 days."}'::jsonb,
  'abnormal',
  '343dc041-bd77-4926-ae2a-16897e7859a2',
  NOW() - INTERVAL '10 days'
);

-- Result 4: Queen - Today (normal - recovered)
INSERT INTO lab_results (
  tenant_id,
  sample_id,
  template_id,
  status,
  result_data,
  interpretation,
  flags,
  created_by,
  created_at
) VALUES (
  '61192a20-6f07-441f-8cfc-0a6584426fcd',
  'edff9789-b798-4133-bedf-dacab9e1b749',
  '4324055e-8300-4585-af7c-fa72d3a7a839',
  'final',
  '{"wbc": 8.2, "rbc": 9.5, "hemoglobin": 14.5, "hematocrit": 42.0, "platelets": 225}'::jsonb,
  '{"summary": "Values returned to normal range", "notes": "Horse has recovered well. Continue regular monitoring."}'::jsonb,
  'normal',
  '343dc041-bd77-4926-ae2a-16897e7859a2',
  NOW()
);

-- Result 5: Roshan - 15 days ago (abnormal)
INSERT INTO lab_results (
  tenant_id,
  sample_id,
  template_id,
  status,
  result_data,
  interpretation,
  flags,
  created_by,
  created_at
) VALUES (
  '61192a20-6f07-441f-8cfc-0a6584426fcd',
  '60777c00-b93c-472a-b3ff-7232ec9aa6fe',
  '4324055e-8300-4585-af7c-fa72d3a7a839',
  'final',
  '{"wbc": 11.5, "rbc": 8.2, "hemoglobin": 12.5, "hematocrit": 36.0, "platelets": 195}'::jsonb,
  '{"summary": "Elevated WBC with low hemoglobin", "notes": "Signs of mild infection. Prescribed antibiotics and rest."}'::jsonb,
  'abnormal',
  '343dc041-bd77-4926-ae2a-16897e7859a2',
  NOW() - INTERVAL '15 days'
);

-- Result 6: Roshan - 5 days ago (normal - improved)
INSERT INTO lab_results (
  tenant_id,
  sample_id,
  template_id,
  status,
  result_data,
  interpretation,
  flags,
  created_by,
  created_at
) VALUES (
  '61192a20-6f07-441f-8cfc-0a6584426fcd',
  '60777c00-b93c-472a-b3ff-7232ec9aa6fe',
  '4324055e-8300-4585-af7c-fa72d3a7a839',
  'reviewed',
  '{"wbc": 9.8, "rbc": 8.8, "hemoglobin": 13.8, "hematocrit": 39.5, "platelets": 215}'::jsonb,
  '{"summary": "Significant improvement from previous test", "notes": "WBC normalizing, hemoglobin recovering. Continue treatment for 3 more days."}'::jsonb,
  'normal',
  '343dc041-bd77-4926-ae2a-16897e7859a2',
  NOW() - INTERVAL '5 days'
);