import { json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
  console.log("=== API Route Called ===");
  console.log("Request method:", request.method);
  console.log("Request URL:", request.url);

  try {
    const body = await request.json();
    const { shop, sessionId, productId, customerId } = body;

    console.log("Received data:", { shop, sessionId, productId, customerId });

    if (!shop || !productId) {
      console.log("Missing required fields");
      return json({ 
        error: "Missing required fields (shop and productId are required)",
        received: { shop, sessionId, productId, customerId }
      }, { status: 400 });
    }

    // Validate that we have either sessionId or customerId
    if (!sessionId && !customerId) {
      console.log("Missing session or customer identification");
      return json({ 
        error: "Either sessionId or customerId is required"
      }, { status: 400 });
    }

    // Build where clause based on available identifiers
    const whereClause = { shop };
    if (customerId) {
      whereClause.customerId = customerId;
    } else {
      whereClause.sessionId = sessionId;
      whereClause.customerId = null; // Ensure we don't match customer records
    }

    console.log("Where clause:", whereClause);

    let list = await prisma.compareList.findFirst({
      where: whereClause,
    });

    let wasAlreadyAdded = false;
    let isLimitExceeded = false;

    if (list) {
      const existing = list.products || [];
      
      // Check if product already exists
      if (existing.includes(productId)) {
        console.log("Product already exists in list");
        wasAlreadyAdded = true;
      } 
      // Check if limit of 4 products is exceeded
      else if (existing.length >= 4) {
        console.log("Maximum 4 products allowed in comparison list");
        isLimitExceeded = true;
      } 
      // Add product to existing list
      else {
        existing.push(productId);
        await prisma.compareList.update({
          where: { id: list.id },
          data: { 
            products: existing,
            updatedAt: new Date()
          },
        });
        console.log("Updated existing list with new product");
      }
    } else {
      // Create new list with first product
      const createData = {
        shop,
        products: [productId],
      };

      // Add customer or session identification
      if (customerId) {
        createData.customerId = customerId;
      } else {
        createData.sessionId = sessionId;
      }

      await prisma.compareList.create({
        data: createData,
      });
      console.log("Created new compare list");
    }

    // Return appropriate response
    if (isLimitExceeded) {
      return json({ 
        success: false,
        error: "Maximum 4 products allowed in comparison list",
        isLimitExceeded: true
      }, { status: 400 });
    }

    if (wasAlreadyAdded) {
      return json({ 
        success: false,
        alreadyAdded: true,
        message: "Product is already in compare list"
      });
    }

    // Get updated count for notification
    const updatedList = await prisma.compareList.findFirst({
      where: whereClause,
    });
    const productCount = updatedList ? updatedList.products.length : 1;

    return json({ 
      success: true,
      message: "Product added to compare list",
      productCount: productCount,
      userType: customerId ? 'customer' : 'guest'
    });
  } catch (err) {
    console.error("Error in compare action:", err);
    return json({ error: "Internal server error", details: err.message }, { status: 500 });
  }
};