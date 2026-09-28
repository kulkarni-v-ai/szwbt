import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTransport() {
  console.log("Seeding Transport Operations Data (University-Provided / Free Service)...");

  // 1. Create Transport Routes
  const route1 = await prisma.transportRoute.upsert({
    where: { code: "RT-01" },
    update: {},
    create: {
      code: "RT-01",
      name: "Route 01: Airport Express",
      origin: "Hubballi Airport (HBX)",
      destination: "KLE Tech Arena / Hostels",
      estimatedMinutes: 35,
      status: "ACTIVE",
      stops: {
        create: [
          { name: "Hubballi Airport T1 Gate 2", orderIndex: 1, expectedMinutes: 0 },
          { name: "Shalmala Hostel Gate", orderIndex: 2, expectedMinutes: 25 },
          { name: "KLE Tech Arena East Gate", orderIndex: 3, expectedMinutes: 35 },
        ],
      },
    },
    include: { stops: true },
  });

  const route2 = await prisma.transportRoute.upsert({
    where: { code: "RT-02" },
    update: {},
    create: {
      code: "RT-02",
      name: "Route 02: Hubballi Junction Shuttle",
      origin: "Hubballi Junction Railway Station (UBL)",
      destination: "KLE Tech Arena / Hostels",
      estimatedMinutes: 25,
      status: "ACTIVE",
      stops: {
        create: [
          { name: "Hubballi Junction Concourse", orderIndex: 1, expectedMinutes: 0 },
          { name: "Vindhya Boys Hostel Gate", orderIndex: 2, expectedMinutes: 18 },
          { name: "Shalmala Hostel Gate", orderIndex: 3, expectedMinutes: 22 },
          { name: "KLE Tech Arena East Gate", orderIndex: 4, expectedMinutes: 25 },
        ],
      },
    },
    include: { stops: true },
  });

  const route3 = await prisma.transportRoute.upsert({
    where: { code: "RT-03" },
    update: {},
    create: {
      code: "RT-03",
      name: "Route 03: Arena - Hostel Circuit",
      origin: "Shalmala Hostel Gate",
      destination: "KLE Tech Badminton Arena",
      estimatedMinutes: 15,
      status: "ACTIVE",
      stops: {
        create: [
          { name: "Shalmala Hostel Gate", orderIndex: 1, expectedMinutes: 0 },
          { name: "Vindhya Boys Hostel Gate", orderIndex: 2, expectedMinutes: 5 },
          { name: "Campus Athlete Village Hub", orderIndex: 3, expectedMinutes: 10 },
          { name: "Main Arena Players Entrance", orderIndex: 4, expectedMinutes: 15 },
        ],
      },
    },
    include: { stops: true },
  });

  console.log("✔ Routes and stops initialized");

  // 2. Create Vehicles
  const vehiclesData = [
    { registrationNumber: "KA-25-EA-9021", type: "AC_BUS", capacity: 45, makeModel: "Tata Starbus 45-Seater Ultra AC", status: "AVAILABLE" },
    { registrationNumber: "KA-25-EA-9022", type: "AC_BUS", capacity: 45, makeModel: "Ashok Leyland Falcon 45-Seater", status: "IN_SERVICE" },
    { registrationNumber: "KA-25-SZ-3011", type: "SHUTTLE_BUS", capacity: 32, makeModel: "Eicher Skyline Pro 32-Seater", status: "AVAILABLE" },
    { registrationNumber: "KA-25-SZ-3012", type: "SHUTTLE_BUS", capacity: 32, makeModel: "Eicher Skyline Pro 32-Seater", status: "IN_SERVICE" },
    { registrationNumber: "KA-25-EV-1001", type: "ELECTRIC_SHUTTLE", capacity: 24, makeModel: "Olectra Greentech Electric 24-Seater", status: "AVAILABLE" },
    { registrationNumber: "KA-25-VN-5501", type: "MINI_VAN", capacity: 14, makeModel: "Force Traveller 14-Seater AC", status: "AVAILABLE" },
  ];

  const vehicles = [];
  for (const v of vehiclesData) {
    const veh = await prisma.transportVehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: { capacity: v.capacity, status: v.status, makeModel: v.makeModel, type: v.type },
      create: v,
    });
    vehicles.push(veh);
  }
  console.log(`✔ ${vehicles.length} Fleet Vehicles initialized`);

  // 3. Create Drivers
  const driversData = [
    { driverCode: "DRV-01", name: "Manjunath K", phone: "+91 94812 34567", licenseNumber: "KA-25-2018-004912", status: "AVAILABLE" },
    { driverCode: "DRV-02", name: "Basavaraj Patil", phone: "+91 94812 34568", licenseNumber: "KA-25-2017-003819", status: "ASSIGNED" },
    { driverCode: "DRV-03", name: "Suresh Gowda", phone: "+91 94812 34569", licenseNumber: "KA-25-2019-007142", status: "AVAILABLE" },
    { driverCode: "DRV-04", name: "Anand Hegde", phone: "+91 94812 34570", licenseNumber: "KA-25-2016-002194", status: "AVAILABLE" },
    { driverCode: "DRV-05", name: "Ravi Kumbar", phone: "+91 94812 34571", licenseNumber: "KA-25-2020-008923", status: "OFF_DUTY" },
  ];

  const drivers = [];
  for (const d of driversData) {
    const drv = await prisma.transportDriver.upsert({
      where: { driverCode: d.driverCode },
      update: { name: d.name, phone: d.phone, licenseNumber: d.licenseNumber, status: d.status },
      create: d,
    });
    drivers.push(drv);
  }
  console.log(`✔ ${drivers.length} Drivers initialized`);

  // 4. Create Trips
  const trip1 = await prisma.transportTrip.upsert({
    where: { tripCode: "TRIP-SZ-001" },
    update: {
      routeId: route1.id,
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      routeName: route1.name,
      vehicleNo: vehicles[0].registrationNumber,
      driverName: drivers[0].name,
      driverPhone: drivers[0].phone,
      pickupPoint: "Hubballi Airport T1 Gate 2",
      dropPoint: "KLE Tech Arena East Gate",
      scheduledDate: "2026-10-18",
      scheduledTime: "08:30 IST",
      estimatedArrival: "09:05 IST",
      status: "SCHEDULED",
      capacity: vehicles[0].capacity,
    },
    create: {
      tripCode: "TRIP-SZ-001",
      routeId: route1.id,
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      routeName: route1.name,
      vehicleNo: vehicles[0].registrationNumber,
      driverName: drivers[0].name,
      driverPhone: drivers[0].phone,
      pickupPoint: "Hubballi Airport T1 Gate 2",
      dropPoint: "KLE Tech Arena East Gate",
      scheduledDate: "2026-10-18",
      scheduledTime: "08:30 IST",
      estimatedArrival: "09:05 IST",
      status: "SCHEDULED",
      capacity: vehicles[0].capacity,
    },
  });

  const trip2 = await prisma.transportTrip.upsert({
    where: { tripCode: "TRIP-SZ-002" },
    update: {
      routeId: route2.id,
      vehicleId: vehicles[1].id,
      driverId: drivers[1].id,
      routeName: route2.name,
      vehicleNo: vehicles[1].registrationNumber,
      driverName: drivers[1].name,
      driverPhone: drivers[1].phone,
      pickupPoint: "Hubballi Junction Concourse",
      dropPoint: "Shalmala Hostel Gate",
      scheduledDate: "2026-10-18",
      scheduledTime: "09:15 IST",
      estimatedArrival: "09:40 IST",
      status: "BOARDING",
      capacity: vehicles[1].capacity,
    },
    create: {
      tripCode: "TRIP-SZ-002",
      routeId: route2.id,
      vehicleId: vehicles[1].id,
      driverId: drivers[1].id,
      routeName: route2.name,
      vehicleNo: vehicles[1].registrationNumber,
      driverName: drivers[1].name,
      driverPhone: drivers[1].phone,
      pickupPoint: "Hubballi Junction Concourse",
      dropPoint: "Shalmala Hostel Gate",
      scheduledDate: "2026-10-18",
      scheduledTime: "09:15 IST",
      estimatedArrival: "09:40 IST",
      status: "BOARDING",
      capacity: vehicles[1].capacity,
    },
  });

  const trip3 = await prisma.transportTrip.upsert({
    where: { tripCode: "TRIP-SZ-003" },
    update: {
      routeId: route3.id,
      vehicleId: vehicles[3].id,
      driverId: drivers[2].id,
      routeName: route3.name,
      vehicleNo: vehicles[3].registrationNumber,
      driverName: drivers[2].name,
      driverPhone: drivers[2].phone,
      pickupPoint: "Shalmala Hostel Gate",
      dropPoint: "Main Arena Players Entrance",
      scheduledDate: "2026-10-18",
      scheduledTime: "10:00 IST",
      estimatedArrival: "10:15 IST",
      status: "IN_TRANSIT",
      capacity: vehicles[3].capacity,
    },
    create: {
      tripCode: "TRIP-SZ-003",
      routeId: route3.id,
      vehicleId: vehicles[3].id,
      driverId: drivers[2].id,
      routeName: route3.name,
      vehicleNo: vehicles[3].registrationNumber,
      driverName: drivers[2].name,
      driverPhone: drivers[2].phone,
      pickupPoint: "Shalmala Hostel Gate",
      dropPoint: "Main Arena Players Entrance",
      scheduledDate: "2026-10-18",
      scheduledTime: "10:00 IST",
      estimatedArrival: "10:15 IST",
      status: "IN_TRANSIT",
      capacity: vehicles[3].capacity,
    },
  });

  const trip4 = await prisma.transportTrip.upsert({
    where: { tripCode: "TRIP-SZ-004" },
    update: {
      routeId: route3.id,
      vehicleId: vehicles[4].id,
      driverId: drivers[3].id,
      routeName: route3.name,
      vehicleNo: vehicles[4].registrationNumber,
      driverName: drivers[3].name,
      driverPhone: drivers[3].phone,
      pickupPoint: "Shalmala Hostel Gate",
      dropPoint: "Main Arena Players Entrance",
      scheduledDate: "2026-10-18",
      scheduledTime: "07:30 IST",
      estimatedArrival: "07:45 IST",
      status: "ARRIVED",
      capacity: vehicles[4].capacity,
    },
    create: {
      tripCode: "TRIP-SZ-004",
      routeId: route3.id,
      vehicleId: vehicles[4].id,
      driverId: drivers[3].id,
      routeName: route3.name,
      vehicleNo: vehicles[4].registrationNumber,
      driverName: drivers[3].name,
      driverPhone: drivers[3].phone,
      pickupPoint: "Shalmala Hostel Gate",
      dropPoint: "Main Arena Players Entrance",
      scheduledDate: "2026-10-18",
      scheduledTime: "07:30 IST",
      estimatedArrival: "07:45 IST",
      status: "ARRIVED",
      capacity: vehicles[4].capacity,
    },
  });

  console.log("✔ Trips initialized");

  // 5. Connect existing participants to Trip 2 (BOARDING) and Trip 1 (SCHEDULED)
  const participants = await prisma.participant.findMany({ take: 6 });
  if (participants.length > 0) {
    // Passenger 0: Boarded
    await prisma.transportPassenger.upsert({
      where: {
        tripId_participantId: {
          tripId: trip2.id,
          participantId: participants[0].id,
        },
      },
      update: {},
      create: {
        tripId: trip2.id,
        participantId: participants[0].id,
        pickupPoint: "Hubballi Junction Concourse",
        dropPoint: "Shalmala Hostel Gate",
        boardingStatus: "BOARDED",
        boardedAt: new Date(),
        boardedBy: "transport@szwbt2026.edu",
      },
    });

    if (participants.length > 1) {
      // Passenger 1: Pending
      await prisma.transportPassenger.upsert({
        where: {
          tripId_participantId: {
            tripId: trip2.id,
            participantId: participants[1].id,
          },
        },
        update: {},
        create: {
          tripId: trip2.id,
          participantId: participants[1].id,
          pickupPoint: "Hubballi Junction Concourse",
          dropPoint: "Shalmala Hostel Gate",
          boardingStatus: "PENDING",
        },
      });
    }

    if (participants.length > 2) {
      // Passenger 2: Pending
      await prisma.transportPassenger.upsert({
        where: {
          tripId_participantId: {
            tripId: trip2.id,
            participantId: participants[2].id,
          },
        },
        update: {},
        create: {
          tripId: trip2.id,
          participantId: participants[2].id,
          pickupPoint: "Hubballi Junction Concourse",
          dropPoint: "Shalmala Hostel Gate",
          boardingStatus: "PENDING",
        },
      });
    }

    if (participants.length > 3) {
      // Passenger 3 on Trip 1: Pending
      await prisma.transportPassenger.upsert({
        where: {
          tripId_participantId: {
            tripId: trip1.id,
            participantId: participants[3].id,
          },
        },
        update: {},
        create: {
          tripId: trip1.id,
          participantId: participants[3].id,
          pickupPoint: "Hubballi Airport T1 Gate 2",
          dropPoint: "KLE Tech Arena East Gate",
          boardingStatus: "PENDING",
        },
      });
    }
  }

  console.log("✔ Sample passengers assigned to trips");
  console.log("Transport database seeding complete!\n");
}

seedTransport()
  .catch((e) => {
    console.error("Error seeding transport:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
