import { PrismaClient, Prisma } from "@prisma/client";
import { hashPin } from "./pin";

const db = new PrismaClient();

const dec = (cents: number) => new Prisma.Decimal(cents / 100);

async function main() {
  console.log("→ Wiping existing data");
  await db.payment.deleteMany();
  await db.orderLineModifier.deleteMany();
  await db.orderLine.deleteMany();
  await db.order.deleteMany();
  await db.shift.deleteMany();
  await db.staff.deleteMany();
  await db.itemModifierGroup.deleteMany();
  await db.modifier.deleteMany();
  await db.modifierGroup.deleteMany();
  await db.inventoryComponent.deleteMany();
  await db.variant.deleteMany();
  await db.item.deleteMany();
  await db.terminal.deleteMany();
  await db.location.deleteMany();
  await db.business.deleteMany();

  console.log("→ Seeding Jewel of the North (restaurant)");
  const jotn = await db.business.create({
    data: {
      slug: "jewel-of-the-north",
      name: "Jewel of the North",
      profile: "restaurant",
      timezone: "America/Los_Angeles",
      taxRate: new Prisma.Decimal("0.089"),
      currency: "USD",
      locations: {
        create: { name: "Main Dining Room", address: "Spokane, WA" },
      },
    },
  });

  const cookTempJOTN = await db.modifierGroup.create({
    data: {
      businessId: jotn.id,
      name: "Cook Temperature",
      selectionType: "single",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      modifiers: {
        create: [
          { name: "Rare", priceDelta: dec(0), sortOrder: 0 },
          { name: "Medium-Rare", priceDelta: dec(0), sortOrder: 1, isDefault: true },
          { name: "Medium", priceDelta: dec(0), sortOrder: 2 },
          { name: "Medium-Well", priceDelta: dec(0), sortOrder: 3 },
          { name: "Well", priceDelta: dec(0), sortOrder: 4 },
        ],
      },
    },
  });

  const burgerAddOnsJOTN = await db.modifierGroup.create({
    data: {
      businessId: jotn.id,
      name: "Burger Add-ons",
      selectionType: "multiple",
      required: false,
      maxSelections: 5,
      modifiers: {
        create: [
          { name: "Bacon", priceDelta: dec(200), sortOrder: 0 },
          { name: "Avocado", priceDelta: dec(150), sortOrder: 1 },
          { name: "Extra Cheese", priceDelta: dec(100), sortOrder: 2 },
          { name: "Fried Egg", priceDelta: dec(150), sortOrder: 3 },
          { name: "No Pickles", priceDelta: dec(0), sortOrder: 4 },
          { name: "No Onion", priceDelta: dec(0), sortOrder: 5 },
        ],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: jotn.id,
      sku: "DRINK-COFFEE",
      name: "Coffee",
      description: "Roast House drip",
      category: "Drinks",
      basePrice: dec(350),
      kitchenStation: "bar",
      sortOrder: 0,
    },
  });

  await db.item.create({
    data: {
      businessId: jotn.id,
      sku: "DRINK-IPA",
      name: "Local IPA",
      description: "No-Li Brewhouse, 16oz draft",
      category: "Drinks",
      basePrice: dec(700),
      kitchenStation: "bar",
      sortOrder: 1,
    },
  });

  await db.item.create({
    data: {
      businessId: jotn.id,
      sku: "DRINK-WINE-RED",
      name: "House Red",
      description: "6oz pour, Walla Walla cab",
      category: "Drinks",
      basePrice: dec(1100),
      kitchenStation: "bar",
      sortOrder: 2,
    },
  });

  await db.item.create({
    data: {
      businessId: jotn.id,
      sku: "APP-CAESAR",
      name: "Caesar Salad",
      description: "Romaine, parmesan, garlic croutons, anchovy dressing",
      category: "Appetizers",
      basePrice: dec(1200),
      kitchenStation: "expo",
      sortOrder: 0,
    },
  });

  await db.item.create({
    data: {
      businessId: jotn.id,
      sku: "ENT-BURGER",
      name: "House Burger",
      description: "Half-pound chuck, cheddar, brioche bun, hand-cut fries",
      category: "Entrees",
      basePrice: dec(1800),
      kitchenStation: "grill",
      sortOrder: 0,
      modifierGroups: {
        create: [
          { modifierGroupId: cookTempJOTN.id, sortOrder: 0 },
          { modifierGroupId: burgerAddOnsJOTN.id, sortOrder: 1 },
        ],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: jotn.id,
      sku: "ENT-STEAK",
      name: "12oz Ribeye",
      description: "USDA Prime, herb butter, roasted potatoes, seasonal veg",
      category: "Entrees",
      basePrice: dec(4400),
      kitchenStation: "grill",
      sortOrder: 1,
      modifierGroups: {
        create: [{ modifierGroupId: cookTempJOTN.id, sortOrder: 0 }],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: jotn.id,
      sku: "DESS-CHOC",
      name: "Flourless Chocolate Cake",
      description: "Vanilla bean ice cream, raspberry coulis",
      category: "Desserts",
      basePrice: dec(1100),
      kitchenStation: "expo",
      sortOrder: 0,
    },
  });

  console.log("→ Seeding Roast House Coffee (cafe-retail)");
  const cafe = await db.business.create({
    data: {
      slug: "roast-house",
      name: "Roast House Coffee",
      profile: "cafe-retail",
      timezone: "America/Los_Angeles",
      taxRate: new Prisma.Decimal("0.089"),
      currency: "USD",
      locations: {
        create: { name: "Garland Ave", address: "Spokane, WA" },
      },
    },
  });

  const milkCafe = await db.modifierGroup.create({
    data: {
      businessId: cafe.id,
      name: "Milk",
      selectionType: "single",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      modifiers: {
        create: [
          { name: "Whole", priceDelta: dec(0), sortOrder: 0, isDefault: true },
          { name: "2%", priceDelta: dec(0), sortOrder: 1 },
          { name: "Oat", priceDelta: dec(75), sortOrder: 2 },
          { name: "Almond", priceDelta: dec(75), sortOrder: 3 },
          { name: "Soy", priceDelta: dec(75), sortOrder: 4 },
          { name: "Half & Half", priceDelta: dec(0), sortOrder: 5 },
        ],
      },
    },
  });

  const shotsCafe = await db.modifierGroup.create({
    data: {
      businessId: cafe.id,
      name: "Extra Shots",
      selectionType: "multiple",
      required: false,
      maxSelections: 4,
      modifiers: {
        create: [
          { name: "+1 Shot", priceDelta: dec(100), sortOrder: 0 },
          { name: "+2 Shots", priceDelta: dec(200), sortOrder: 1 },
          { name: "Decaf", priceDelta: dec(0), sortOrder: 2 },
          { name: "Half-Caf", priceDelta: dec(0), sortOrder: 3 },
        ],
      },
    },
  });

  const syrupCafe = await db.modifierGroup.create({
    data: {
      businessId: cafe.id,
      name: "Syrup",
      selectionType: "multiple",
      required: false,
      maxSelections: 3,
      modifiers: {
        create: [
          { name: "Vanilla", priceDelta: dec(75), sortOrder: 0 },
          { name: "Caramel", priceDelta: dec(75), sortOrder: 1 },
          { name: "Hazelnut", priceDelta: dec(75), sortOrder: 2 },
          { name: "Lavender", priceDelta: dec(75), sortOrder: 3 },
          { name: "Brown Sugar", priceDelta: dec(75), sortOrder: 4 },
        ],
      },
    },
  });

  const latte = await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "ESP-LATTE",
      name: "Latte",
      description: "Two shots espresso, steamed milk, light foam",
      category: "Espresso",
      basePrice: dec(450),
      kitchenStation: "bar",
      sortOrder: 0,
      variants: {
        create: [
          { name: "8oz", priceDelta: dec(0), sortOrder: 0 },
          { name: "12oz", priceDelta: dec(50), sortOrder: 1, isDefault: true },
          { name: "16oz", priceDelta: dec(100), sortOrder: 2 },
        ],
      },
      modifierGroups: {
        create: [
          { modifierGroupId: milkCafe.id, sortOrder: 0 },
          { modifierGroupId: shotsCafe.id, sortOrder: 1 },
          { modifierGroupId: syrupCafe.id, sortOrder: 2 },
        ],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "ESP-CAPP",
      name: "Cappuccino",
      description: "Two shots espresso, equal parts steamed milk and foam",
      category: "Espresso",
      basePrice: dec(425),
      kitchenStation: "bar",
      sortOrder: 1,
      modifierGroups: {
        create: [
          { modifierGroupId: milkCafe.id, sortOrder: 0 },
          { modifierGroupId: shotsCafe.id, sortOrder: 1 },
        ],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "ESP-AMERICANO",
      name: "Americano",
      description: "Two shots espresso, hot water",
      category: "Espresso",
      basePrice: dec(350),
      kitchenStation: "bar",
      sortOrder: 2,
      modifierGroups: {
        create: [{ modifierGroupId: shotsCafe.id, sortOrder: 0 }],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "DRIP-HOUSE",
      name: "Drip Coffee",
      description: "House blend, rotating origins",
      category: "Brewed",
      basePrice: dec(325),
      kitchenStation: "bar",
      sortOrder: 0,
      variants: {
        create: [
          { name: "12oz", priceDelta: dec(0), sortOrder: 0, isDefault: true },
          { name: "16oz", priceDelta: dec(50), sortOrder: 1 },
        ],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "BAKE-CROISSANT",
      name: "Butter Croissant",
      description: "Baked fresh daily",
      category: "Pastries",
      basePrice: dec(425),
      sortOrder: 0,
    },
  });

  await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "BAKE-MUFFIN",
      name: "Blueberry Muffin",
      description: "House-made, lemon glaze",
      category: "Pastries",
      basePrice: dec(395),
      sortOrder: 1,
    },
  });

  await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "MERCH-TEE",
      name: "Roast House T-Shirt",
      description: "Heather grey, screen-printed logo",
      category: "Merch",
      basePrice: dec(2500),
      barcode: "8901234567890",
      trackInventory: true,
      sortOrder: 0,
      variants: {
        create: [
          { name: "S", priceDelta: dec(0), sortOrder: 0 },
          { name: "M", priceDelta: dec(0), sortOrder: 1, isDefault: true },
          { name: "L", priceDelta: dec(0), sortOrder: 2 },
          { name: "XL", priceDelta: dec(0), sortOrder: 3 },
        ],
      },
    },
  });

  await db.item.create({
    data: {
      businessId: cafe.id,
      sku: "MERCH-BEANS",
      name: "Whole Bean Coffee — 12oz Bag",
      description: "Single-origin, rotating roast",
      category: "Merch",
      basePrice: dec(1800),
      barcode: "8901234567891",
      trackInventory: true,
      sortOrder: 1,
    },
  });

  console.log("→ Seeding staff (PIN 1234 for everyone in dev)");
  await db.staff.createMany({
    data: [
      { businessId: jotn.id, name: "J", role: "owner", pinHash: hashPin("1234") },
      { businessId: jotn.id, name: "Sarah", role: "server", pinHash: hashPin("1234") },
      { businessId: jotn.id, name: "Marco", role: "manager", pinHash: hashPin("1234") },
      { businessId: cafe.id, name: "J", role: "owner", pinHash: hashPin("1234") },
      { businessId: cafe.id, name: "Maya", role: "cashier", pinHash: hashPin("1234") },
      { businessId: cafe.id, name: "Devon", role: "manager", pinHash: hashPin("1234") },
    ],
  });

  console.log("✓ Seed complete");
  console.log(`  Restaurant: ${jotn.name} (${jotn.slug})`);
  console.log(`  Cafe:       ${cafe.name} (${cafe.slug})`);
  console.log(`  All staff:  PIN 1234 (dev only)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
