import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { sessionId, shop, productId, customerId } = body;

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

    console.log("Finding compare list with where clause:", whereClause);

    // Find the existing compare list
    const existingList = await prisma.compareList.findFirst({
      where: whereClause,
    });

    if (!existingList) {
      return json({ 
        error: "Compare list not found",
        userType: customerId ? 'customer' : 'guest'
      }, { status: 404 });
    }

    // Convert productId to string for comparison
    const productIdStr = productId.toString();
    
    // Remove the product from the list
    const updatedProducts = existingList.products.filter(id => {
      // Handle both numeric IDs and GraphQL global IDs
      const idStr = id.toString();
      const numericId = idStr.startsWith('gid://shopify/Product/') 
        ? idStr.replace('gid://shopify/Product/', '')
        : idStr;
      
      const productNumericId = productIdStr.startsWith('gid://shopify/Product/')
        ? productIdStr.replace('gid://shopify/Product/', '')
        : productIdStr;
      
      return numericId !== productNumericId;
    });

    // If no products remain, optionally delete the entire list
    if (updatedProducts.length === 0) {
      await prisma.compareList.delete({
        where: { id: existingList.id },
      });
      
      console.log("Deleted empty compare list");
      
      return json({ 
        success: true, 
        message: "Product removed and list deleted (was empty)",
        remainingCount: 0,
        products: [],
        userType: customerId ? 'customer' : 'guest',
        listDeleted: true
      });
    }

    // Update the database
    const updatedList = await prisma.compareList.update({
      where: { id: existingList.id },
      data: { 
        products: updatedProducts,
        updatedAt: new Date()
      },
    });

    console.log("Updated compare list, remaining products:", updatedProducts.length);

    return json({ 
      success: true, 
      message: "Product removed successfully",
      remainingCount: updatedProducts.length,
      products: updatedProducts,
      userType: customerId ? 'customer' : 'guest',
      listDeleted: false
    });

  } catch (error) {
    console.error("Error removing product from compare list:", error);
    return json({ 
      error: "Failed to remove product", 
      details: error.message 
    }, { status: 500 });
  }
};