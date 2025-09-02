import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  if (request.method === "POST") {
    const { name, products } = await request.json();
    
    try {
      const comparison = await prisma.comparisonSet.create({
        data: {
          shop: session.shop,
          name,
          products: JSON.stringify(products),
        },
      });
      
      return json({ success: true, comparison });
    } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }
  
  return json({ success: false, error: "Method not allowed" }, { status: 405 });
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
    const comparisons = await prisma.comparisonSet.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
    });
    
    return json({ comparisons });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};