import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const IT_SYSTEM_NAMES = [
  "OCA",
  "TIMS",
  "Östgötatrafiken-konto",
  "Ace",
  "Axentia",
  "Ödoc",
  "TRV",
  "Teleopti",
] as const;

async function main() {
  console.log("Tömmer databasen...");

  try {
    await prisma.subTaskProgress.deleteMany();
    await prisma.subTask.deleteMany();
    await prisma.taskProgress.deleteMany();
    await prisma.systemChecklist.deleteMany();
    await prisma.task.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2021" || (err.message && err.message.includes("does not exist"))) {
      console.error("\nTabellerna finns inte i databasen. Skapa dem först:");
      console.error("1. Kör: npm run db:sql");
      console.error("2. Kopiera hela SQL-utskriften");
      console.error("3. Supabase → SQL Editor → klistra in och kör");
      console.error("4. Kör sedan: npm run db:seed\n");
      throw e;
    }
    throw e;
  }

  console.log("Skapar användare (Admin, Arbetsledare, Mentor, Nyanställd)...");

  const [admin, arbetsledare, mentor, nyanstalld] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin Ötic",
        email: "admin@otic.se",
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        name: "Arbetsledare Admin",
        email: "arbetsledare@ostgotatrafiken.se",
        role: "ARBETSLEDARE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Mentor Utbildare",
        email: "mentor@ostgotatrafiken.se",
        role: "MENTOR",
      },
    }),
    prisma.user.create({
      data: {
        name: "Nyanställd Test",
        email: "nyanstalld@ostgotatrafiken.se",
        role: "NYANSTALLD",
      },
    }),
  ]);

  console.log("Skapar IT-systemchecklistor för nyanställd (grunddata)...");

  await prisma.systemChecklist.createMany({
    data: IT_SYSTEM_NAMES.map((systemName) => ({
      systemName,
      status: "PENDING",
      nyanstalldId: nyanstalld.id,
    })),
  });

  console.log("Skapar kategorier...");

  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Östgötatrafiken & Uppdrag", sortOrder: 1 },
    }),
    prisma.category.create({
      data: { name: "Trafikledarens roll & Rutiner", sortOrder: 2 },
    }),
    prisma.category.create({
      data: { name: "Linjekännedom & Fordon", sortOrder: 3 },
    }),
    prisma.category.create({
      data: { name: "Våra olika system", sortOrder: 4 },
    }),
    prisma.category.create({
      data: { name: "Specifika arbetsuppgifter", sortOrder: 5 },
    }),
    prisma.category.create({
      data: { name: "Linjeträning och företagsbesök", sortOrder: 6 },
    }),
  ]);

  const [
    catOstgotaUppdrag,
    catTrafikledarensRoll,
    catLinjekannedom,
    catVaraSystem,
    catSpecifikaUppgifter,
    catLinjetraning,
  ] = categories;

  console.log("Skapar uppgifter (Tasks)...");

  // 1. Östgötatrafiken & Uppdrag
  await prisma.task.createMany({
    data: [
      {
        categoryId: catOstgotaUppdrag.id,
        title:
          "Information om företaget (uppdrag, organisation, processer, vision, värdegrund, internwebb)",
        sortOrder: 1,
      },
      {
        categoryId: catOstgotaUppdrag.id,
        title: "ÖTIC:s uppdrag",
        sortOrder: 2,
      },
      {
        categoryId: catOstgotaUppdrag.id,
        title: "Upplägg med trafikföretag, avtal",
        sortOrder: 3,
      },
      {
        categoryId: catOstgotaUppdrag.id,
        title: "Olika trafikslag (allmän kollektivtrafik och särskild)",
        sortOrder: 4,
      },
      {
        categoryId: catOstgotaUppdrag.id,
        title: "Planering under trafikåret (Vem sköter vad? TL:s roll)",
        sortOrder: 5,
      },
    ],
  });

  // 2. Trafikledarens roll & Rutiner
  await prisma.task.createMany({
    data: [
      {
        categoryId: catTrafikledarensRoll.id,
        title:
          "Trafikledarens/trafikinformatörens roll (Arbetsbeskrivningar, Rutinbeskrivningar)",
        sortOrder: 1,
      },
      {
        categoryId: catTrafikledarensRoll.id,
        title: "Upplägg gällande omlopp, trafikföretag/driftledningar",
        sortOrder: 2,
      },
      {
        categoryId: catTrafikledarensRoll.id,
        title: "Rutiner vid störningar: Omledning av trafik",
        sortOrder: 3,
      },
      {
        categoryId: catTrafikledarensRoll.id,
        title: "Rutiner vid störningar: Kundinformation",
        sortOrder: 4,
      },
      {
        categoryId: catTrafikledarensRoll.id,
        title:
          "Rutiner vid störningar: Ersättningsbussar (Östgötapendeln och spårvagnar)",
        sortOrder: 5,
      },
      {
        categoryId: catTrafikledarensRoll.id,
        title: "Rutiner vid störningar: Taxibeställningar/bussbeställningar",
        sortOrder: 6,
      },
    ],
  });

  // 3. Linjekännedom & Fordon
  await prisma.task.createMany({
    data: [
      {
        categoryId: catLinjekannedom.id,
        title: "Fordonstyper",
        sortOrder: 1,
      },
      {
        categoryId: catLinjekannedom.id,
        title: "Linjekännedom teoretisk (Bytespunkter, InGrid-kartan)",
        sortOrder: 2,
      },
      {
        categoryId: catLinjekannedom.id,
        title: "Linjer: Expresslinjer 3X, 4X, 5X, 6X, 7X",
        sortOrder: 3,
      },
      {
        categoryId: catLinjekannedom.id,
        title: "Linjer: Norrköping tätort 1XX",
        sortOrder: 4,
      },
      {
        categoryId: catLinjekannedom.id,
        title: "Linjer: Linköping tätort 2XX",
        sortOrder: 5,
      },
      {
        categoryId: catLinjekannedom.id,
        title: "Linjer: Motala/Mjölby tätort 3XX",
        sortOrder: 6,
      },
      {
        categoryId: catLinjekannedom.id,
        title:
          "Linjer: Landsbygd Finspång/Norrköping/Söderköping/Valdemarsvik 4XX",
        sortOrder: 7,
      },
      {
        categoryId: catLinjekannedom.id,
        title: "Linjer: Landsbygd/Närområde Linköping 5XX",
        sortOrder: 8,
      },
      {
        categoryId: catLinjekannedom.id,
        title: "Linjer: Landsbygd Mjölby/Boxholm/Ödeshög 6XX",
        sortOrder: 9,
      },
    ],
  });

  // 4. Våra olika system
  await prisma.task.createMany({
    data: [
      {
        categoryId: catVaraSystem.id,
        title: "Teleopti (Personalschema)",
        sortOrder: 1,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Kommunikationsradio (Rakel samt handenhet)",
        sortOrder: 2,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Telefonsystem (ACE + Fallback, sms och tonval)",
        sortOrder: 3,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Informationskanaler: TIMS",
        sortOrder: 4,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Informationskanaler: Webben, Appen, Planner, Digitala skyltar",
        sortOrder: 5,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Störningsmeddelande (incidentinfo)",
        sortOrder: 6,
      },
      {
        categoryId: catVaraSystem.id,
        title: "\"Så här skriver vi\" (häfte)",
        sortOrder: 7,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Internwebb",
        sortOrder: 8,
      },
      {
        categoryId: catVaraSystem.id,
        title: "First line – support (Easit)",
        sortOrder: 9,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Rebus (Tidtabeller, omlopp, trafikföretag, avtalsinformation)",
        sortOrder: 10,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Pubtrans (All trafikdata)",
        sortOrder: 11,
      },
      {
        categoryId: catVaraSystem.id,
        title: "OCA/Ingrid (Fordon i realtid, trafikledaråtgärder)",
        sortOrder: 12,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Transit Cloud (Spårningshistorik)",
        sortOrder: 13,
      },
      {
        categoryId: catVaraSystem.id,
        title:
          "Teams (Planner, filer, schemaavvikelser, chatt internt och med VR, Nobina, Transdev, KS/BC)",
        sortOrder: 14,
      },
      {
        categoryId: catVaraSystem.id,
        title:
          "ÖDOC (Ärendehanteringssystem för trafikhändelser, beställningar, viteshantering, kundärenden)",
        sortOrder: 15,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Sharepoint (ÖTIC:s egna internwebb, hittegods, tågsummering)",
        sortOrder: 16,
      },
      {
        categoryId: catVaraSystem.id,
        title: "GAIA (Nytt biljettsystem)",
        sortOrder: 17,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Easit (Felanmälan hållplatser och IT-support)",
        sortOrder: 18,
      },
      {
        categoryId: catVaraSystem.id,
        title: "Reseplaneraren, Resrobot, Google maps, Streetview",
        sortOrder: 19,
      },
    ],
  });

  // 5. Specifika arbetsuppgifter
  await prisma.task.createMany({
    data: [
      {
        categoryId: catSpecifikaUppgifter.id,
        title: "Olyckor/Hot (Larm, intern/extern info, media, omledning)",
        sortOrder: 1,
      },
      {
        categoryId: catSpecifikaUppgifter.id,
        title: "Vägarbeten/omläggningar (Processen trafikmeddelande, TIMS)",
        sortOrder: 2,
      },
      {
        categoryId: catSpecifikaUppgifter.id,
        title: "Evenemang (Planner, extra buss, TM, COOR)",
        sortOrder: 3,
      },
      {
        categoryId: catSpecifikaUppgifter.id,
        title: "Gruppresor (Föranmälan, kulturbiljett, förstärkningar)",
        sortOrder: 4,
      },
      {
        categoryId: catSpecifikaUppgifter.id,
        title: "Resegaranti (Regler, Kom fram garanti Resplus, Hotellbokning)",
        sortOrder: 5,
      },
      {
        categoryId: catSpecifikaUppgifter.id,
        title:
          "Vinterväghållning (Snöpärm, felanmälan gator/trafikljus, trafikhinder)",
        sortOrder: 6,
      },
      {
        categoryId: catSpecifikaUppgifter.id,
        title:
          "Hittegods (Vad letar vi efter, hänvisning till rätt trafikföretag)",
        sortOrder: 7,
      },
    ],
  });

  // 6. Linjeträning och företagsbesök
  await prisma.task.createMany({
    data: [
      {
        categoryId: catLinjetraning.id,
        title:
          "Dag 1 - Västra trafikområdet (Mjölby, Skänninge, Motala, Connect Motala depå, Borensberg, Vadstena, Mantorp)",
        sortOrder: 1,
      },
      {
        categoryId: catLinjetraning.id,
        title:
          "Dag 2 - Mellersta trafikområdet (Linköping, Nobinas depå Kallerstad, Trädgårdstorget m.fl., Linghem, Vikingstad, Kisa, Åtvid)",
        sortOrder: 2,
      },
      {
        categoryId: catLinjetraning.id,
        title:
          "Dag 3 - Östra trafikområdet (Valdemarsvik, Söderköping, Transdev Norrköpings depå, Mohlins depå, Spårvagnsdepå, linje 2 och 3)",
        sortOrder: 3,
      },
      {
        categoryId: catLinjetraning.id,
        title:
          "Dag 4 - Östra trafikområdet (Kimstad, Kolmården, Åby, Vistinge, Finspång)",
        sortOrder: 4,
      },
    ],
  });

  console.log("Skapar delmoment (SubTasks) för Trafikledarens/trafikinformatörens roll...");

  const trafikledareTask = await prisma.task.findFirst({
    where: {
      categoryId: catTrafikledarensRoll.id,
      title: "Trafikledarens/trafikinformatörens roll (Arbetsbeskrivningar, Rutinbeskrivningar)",
    },
  });

  if (trafikledareTask) {
    await prisma.subTask.createMany({
      data: [
        {
          taskId: trafikledareTask.id,
          title: "Arbetsbeskrivning plats 01",
          url: "https://sharepoint.com/plats01",
          sortOrder: 1,
        },
        {
          taskId: trafikledareTask.id,
          title: "Arbetsuppgifter under nattpass",
          url: "https://sharepoint.com/nattpass",
          sortOrder: 2,
        },
        {
          taskId: trafikledareTask.id,
          title: "Hantering av hittegods",
          url: "https://sharepoint.com/hittegods",
          sortOrder: 3,
        },
      ],
    });
  }

  console.log("Seed klar.");
  console.log("Användare: Admin (admin@otic.se), Arbetsledare, Mentor, Nyanställd (med 8 IT-system).");
  console.log("Kategorier: 6. Uppgifter: 50. Delmoment: 3 (under Trafikledarens roll).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
