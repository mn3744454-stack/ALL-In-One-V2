Stable Housing / Admissions / Services Forensic Audit

## 1. Executive Diagnosis

The system currently has **two disconnected commercial layers** that do not function as one coherent business model:

1. *`tenant_services`** — a flat, generic service catalog `/dashboard/services`) with `name`, `price_display` (string), `service_type`. This behaves like a public-facing or display-oriented catalog, not a structured commercial engine.

2. *`stable_service_plans`** — a structured plan system currently exposed through Housing `/housing?tab=plans`) with `base_price`, `billing_cycle`, `currency`, `plan_type`, `includes` JSONB. This is closer to a commercial engine, but it is currently isolated from the main Services philosophy and incorrectly positioned under Housing.

The core structural problem is:

**There is no single authoritative commercial source of truth for what the stable offers, how it is packaged, how it is priced, what it includes, and how that offering is later consumed by Admissions.**

Current fragmentation:

- Services behaves like a generic catalog

- Plans behaves like a partial pricing engine

- Admissions can consume plans, but can also bypass them entirely

- Housing contains operational workflows, but also currently contains commercial definitions

- Admission Detail is mostly passive

- Arrivals & Departures is still a passive log

**Final diagnosis:**

The system needs a **clear separation between commercial modeling and operational execution**:

- **Services** must become the commercial umbrella

- **Plans / Packages / Programs** must become structured child definitions under Services

- **Admissions** must consume those structured offerings

- **Housing** must remain an operational layer only

---

## 2. What the Current System Actually Does

### Admission Creation Flow (current)

1. Horse — select from active horses

2. Client — optional

3. Housing — branch required, area/unit optional

4. Plan — optional

5. Rates — manual or prefilled

6. Details — reason, instructions, emergency contact

7. Review — confirm

### Post-Admission Reality

- Admission card appears in list with horse, status, warning count, client, date, unit, rate

- Clicking opens `AdmissionDetailSheet` with:

  - horse info

  - warnings

  - client / branch / area / unit / dates / rate / instructions / emergency contact

  - status history

  - care notes

  - checkout button

- The panel is mostly read-only and not operational enough

### Arrivals & Departures

- Admission check-in generates the movement event

- The list displays movement cards

- The cards are currently passive and non-interactive

### Services Page

- Separate page under `/dashboard/services`

- Uses generic `tenant_services`

- Not truly connected to admissions as a strong source of truth

- Feels more like generic business showcase/catalog than structured commercial modeling

---

## 3. Where the UX and Business Model Are Misaligned

| Problem | Evidence |

|---------|----------|

| Services is too flat and generic | `tenant_services` does not contain enough structure for stable commercial modeling |

| Plans exist but in the wrong place | `stable_service_plans` lives under Housing, even though it is commercial, not operational |

| Admissions are still too manual | plan selection is optional and pricing can still be freely composed |

| Admission Detail is too passive | warnings are displayed but not actionable; key stay data is not editable |

| Arrivals & Departures is a dead-end log | non-clickable cards, no drill-down, no back-link to admission |

| Care Notes are useful but isolated | they are not yet meaningfully tied to reusable service definitions |

The diagnosis is confirmed:

1. Admissions are still too manually assembled  

2. Services is not yet the real source of truth  

3. Admission Detail is too passive  

4. Arrivals & Departures is too passive  

5. Care Notes are present but not yet integrated into a broader reusable service model  

---

## 4. Services vs Admissions vs Housing

### Correct responsibilities

| Layer | Correct Responsibility |

|-------|----------------------|

| **Services** | Commercial definition layer. What the stable offers, how it is grouped, packaged, priced, and what it includes. |

| **Plans / Packages / Programs** | Structured child offerings inside Services. They are not separate from Services philosophically; they are sub-structures within the Services domain. |

| **Housing** | Operational facility layer. Units, areas, occupancy, physical assignment. |

| **Admissions** | Transactional stay layer. A concrete horse stay that consumes a service/package/plan and executes it inside Housing. |

| **Arrivals & Departures** | Event/timeline layer. Logs operational movement and links back to admission context. |

| **Care Notes** | Operational artifact layer. Instructions and records attached to the horse or admission; some may later be generated from selected services/plans. |

### Final structural principle

**Services should be the umbrella.  

Plans should not compete with Services.  

Plans should live under Services.  

Housing should not own commercial definitions.**

---

## 5. Recommended Service Modeling for the Stable Domain

### Current problem

There are currently two disconnected models:

- `tenant_services`

- `stable_service_plans`

Neither is sufficient alone.

### Final recommendation

Use **Services as the top-level commercial model**, and place **Plans / Packages / Programs** under it.

### Recommended future structure

#### Service

Represents the broad offering family, such as:

- Boarding

- Training

- Riding

- Medical Boarding

- Rehabilitation

- Premium Care

- Temporary Stay

- Breeding Support

#### Under each Service

Allow structured child definitions such as:

- plans

- packages

- programs

- included items

- defaults

- pricing models

- billing cycle rules

### Implication

`stable_service_plans` should not remain conceptually isolated.

It should evolve into one of the structured child layers under the broader Services domain.

### What to do with current tables

- Either evolve `tenant_services` into a richer stable-capable commercial model

- Or keep `tenant_services` as the parent service layer and let `stable_service_plans` become the child structured offering layer

- But do **not** leave them conceptually separate and parallel forever

### Best direction

For stable accounts:

- `tenant_services` becomes the umbrella commercial object

- `stable_service_plans` becomes the structured child offering object

- Admissions consume the child offering

- Services page becomes the place where the user defines both the service and its plans/packages/programs

---

## 6. Services vs Packages vs Plans vs Programs

### Recommended meaning in the Stable domain

| Term | Meaning |

|------|---------|

| **Service** | Broad commercial offering family (e.g. Boarding, Training, Rehab) |

| **Plan** | A pricing/timing structure for a service (e.g. Monthly Boarding Plan, Daily Rehab Plan) |

| **Package** | A bundled included-content offering under a service/plan (e.g. boarding + feed + grooming + weekly vet check) |

| **Program** | A more structured or time-based offering (e.g. 8-week conditioning program, 30-day rehabilitation program) |

### Important rule

Do not make these four terms four unrelated systems.

They should be modeled as related commercial constructs inside the broader Services architecture.

---

## 7. Recommended Admission Wizard Structure

Current:

1. Horse

2. Client

3. Housing

4. Plan

5. Rates

6. Details

7. Review

### Recommended future order

```text

1. Horse

2. Client

3. Service

4. Plan / Package / Program

5. Housing

6. Rates & Terms

7. Care & Details

8. Review