import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const customerId = url.searchParams.get("customerId");
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  // Validate that we have either sessionId or customerId
  if (!sessionId && !customerId) {
    return json({ error: "Either sessionId or customerId is required" }, { status: 400 });
  }

  try {
    // Build where clause based on available identifiers
    const whereClause = { shop };
    if (customerId) {
      whereClause.customerId = customerId;
    } else {
      whereClause.sessionId = sessionId;
      whereClause.customerId = null; // Ensure we don't match customer records
    }

    console.log("Fetching compare list with where clause:", whereClause);

    const list = await prisma.compareList.findFirst({
      where: whereClause,
    });

    if (!list || !list.products?.length) {
      return json({ 
        products: [],
        userType: customerId ? 'customer' : 'guest'
      });
    }

    // Use public app proxy authentication
    const { admin } = await authenticate.public.appProxy(request);

    // Convert numeric IDs to GraphQL global IDs
    const globalIds = list.products.map(id => {
      if (id.startsWith('gid://shopify/Product/')) {
        return id;
      }
      return `gid://shopify/Product/${id}`;
    });

    const query = `
      query getProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            status
            vendor
            productType
            createdAt
            tags
            description
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  inventoryQuantity
                  sku
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { ids: globalIds },
    });

    const jsonData = await response.json();
    
    if (jsonData.errors) {
      console.error("GraphQL errors:", jsonData.errors);
      return json({ error: "GraphQL query failed", details: jsonData.errors }, { status: 500 });
    }

    const products = jsonData.data.nodes.filter(Boolean); // Filter out null nodes

    return json({ 
      products,
      userType: customerId ? 'customer' : 'guest',
      listInfo: {
        id: list.id,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        productCount: products.length
      }
    });
  } catch (error) {
    console.error("Error loading products:", error);
    return json({ error: "Failed to load products", details: error.message }, { status: 500 });
  }
};