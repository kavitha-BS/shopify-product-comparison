import { json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { shop, sessionId, productId, customerId } = body;

    if (!shop || !productId) {
      return json({ error: "Missing required parameters (shop and productId)" }, { status: 400 });
    }

    // Validate that we have either sessionId or customerId
    if (!sessionId && !customerId) {
      return json({ error: "Either sessionId or customerId is required" }, { status: 400 });
    }

    // Build where clause based on available identifiers
    const whereClause = { shop };
    if (customerId) {
      whereClause.customerId = customerId;
    } else {
      whereClause.sessionId = sessionId;
      whereClause.customerId = null; // Ensure we don't match customer records
    }

    console.log("Checking product in compare list with where clause:", whereClause);

    const list = await prisma.compareList.findFirst({
      where: whereClause,
    });

    if (!list || !list.products) {
      return json({ 
        inCompare: false,
        userType: customerId ? 'customer' : 'guest',
        totalProducts: 0
      });
    }

    // Convert productId to string for comparison
    const productIdStr = productId.toString();
    
    // Check if product exists in the list
    const inCompare = list.products.some(id => {
      // Handle both numeric IDs and GraphQL global IDs
      const idStr = id.toString();
      const numericId = idStr.startsWith('gid://shopify/Product/') 
        ? idStr.replace('gid://shopify/Product/', '')
        : idStr;
      
      const productNumericId = productIdStr.startsWith('gid://shopify/Product/')
        ? productIdStr.replace('gid://shopify/Product/', '')
        : productIdStr;
      
      return numericId === productNumericId;
    });

    return json({ 
      inCompare,
      userType: customerId ? 'customer' : 'guest',
      totalProducts: list.products.length,
      listInfo: {
        id: list.id,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt
      }
    });

  } catch (error) {
    console.error("Error checking product in compare list:", error);
    return json({ 
      error: "Failed to check product status", 
      details: error.message 
    }, { status: 500 });
  }
};