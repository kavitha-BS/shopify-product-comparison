import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  Card,
  Layout,
  Page,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  DataTable,
  Modal,
  FormLayout,
  TextField,
  Select,
  Thumbnail,
  ActionList,
  Popover,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    // Using GraphQL instead of REST for better reliability
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              vendor
              productType
              createdAt
              updatedAt
              description
              tags
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
      }
    `;

    const response = await admin.graphql(query, {
      variables: {
        first: 250,
      },
    });

    const responseJson = await response.json();
    
    // Transform GraphQL response to match our component expectations
    const products = responseJson.data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      status: node.status.toLowerCase(),
      vendor: node.vendor,
      product_type: node.productType,
      created_at: node.createdAt,
      updated_at: node.updatedAt,
      body_html: node.description,
      tags: node.tags.join(', '),
      images: node.images.edges.map(({ node: image }) => ({
        src: image.url,
        alt: image.altText,
      })),
      variants: node.variants.edges.map(({ node: variant }) => ({
        id: variant.id,
        price: variant.price,
        inventory_quantity: variant.inventoryQuantity,
        sku: variant.sku,
      })),
    }));

    return json({
      products,
      shop: session.shop,
    });
  } catch (error) {
    console.error("Error loading products:", error);
    return json({
      products: [],
      shop: "",
      error: "Failed to load products. Please check your app configuration.",
    });
  }
};

export default function Index() {
  const { products, shop, error } = useLoaderData();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [comparisonActive, setComparisonActive] = useState(false);
  const [saveModalActive, setSaveModalActive] = useState(false);
  const [comparisonName, setComparisonName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopover = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    []
  );

  // Handle error state
  if (error) {
    return (
      <Page>
        <TitleBar title="Product Comparison Tool" />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2" tone="critical">
                  Error Loading Products
                </Text>
                <Text variant="bodyMd">
                  {error}
                </Text>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const handleProductSelect = useCallback((product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== product.id);
      } else if (prev.length < 4) {
        return [...prev, product];
      }
      return prev;
    });
  }, []);

  const handleCompare = useCallback(() => {
    if (selectedProducts.length >= 2) {
      setComparisonActive(true);
    }
  }, [selectedProducts]);

  const handleSaveComparison = useCallback(() => {
    setSaveModalActive(true);
  }, []);

  const handleSaveComparisonSubmit = useCallback(async () => {
    const comparisonData = {
      name: comparisonName,
      products: selectedProducts,
      shop,
    };

    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(comparisonData),
      });

      if (response.ok) {
        setSaveModalActive(false);
        setComparisonName("");
        // Show success message
      }
    } catch (error) {
      console.error("Error saving comparison:", error);
    }
  }, [comparisonName, selectedProducts, shop]);

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "price":
        return parseFloat(a.variants[0]?.price || 0) - parseFloat(b.variants[0]?.price || 0);
      case "created_at":
        return new Date(b.created_at) - new Date(a.created_at);
      default:
        return 0;
    }
  });

  const productRows = sortedProducts.map((product) => [
    <div key={product.id} style={{ display: "flex", alignItems: "center" }}>
      <input
        type="checkbox"
        checked={selectedProducts.some((p) => p.id === product.id)}
        onChange={() => handleProductSelect(product)}
        style={{ marginRight: "10px" }}
        disabled={selectedProducts.length >= 4 && !selectedProducts.some((p) => p.id === product.id)}
      />
      <Thumbnail
        source={product.images[0]?.src || ""}
        alt={product.title}
        size="small"
      />
      <div style={{ marginLeft: "10px" }}>
        <Text variant="bodyMd" fontWeight="bold">
          {product.title}
        </Text>
      </div>
    </div>,
    `${product.variants[0]?.price || "0.00"}`,
    <Badge tone={product.status === "active" ? "success" : "subdued"}>
      {product.status}
    </Badge>,
    product.variants[0]?.inventory_quantity || 0,
    new Date(product.created_at).toLocaleDateString(),
  ]);

  const comparisonRows = selectedProducts.length > 0 ? [
    ["Product", ...selectedProducts.map((p) => p.title)],
    [
      "Image",
      ...selectedProducts.map((p) => (
        <Thumbnail
          key={p.id}
          source={p.images[0]?.src || ""}
          alt={p.title}
          size="medium"
        />
      )),
    ],
    ["Price", ...selectedProducts.map((p) => `${p.variants[0]?.price || "0.00"}`)],
    ["Status", ...selectedProducts.map((p) => p.status)],
    ["Inventory", ...selectedProducts.map((p) => p.variants[0]?.inventory_quantity || 0)],
    ["Created", ...selectedProducts.map((p) => new Date(p.created_at).toLocaleDateString())],
    ["Description", ...selectedProducts.map((p) => p.body_html?.substring(0, 100) + "..." || "No description")],
    ["Vendor", ...selectedProducts.map((p) => p.vendor || "Unknown")],
    ["Product Type", ...selectedProducts.map((p) => p.product_type || "Uncategorized")],
    ["Tags", ...selectedProducts.map((p) => p.tags || "No tags")],
  ] : [];

  const sortOptions = [
    { label: "Title", value: "title" },
    { label: "Price", value: "price" },
    { label: "Created Date", value: "created_at" },
  ];

  const activator = (
    <Button onClick={togglePopover} disclosure>
      Sort by {sortOptions.find(option => option.value === sortBy)?.label}
    </Button>
  );

  return (
    <Page>
      <TitleBar title="Product Comparison Tool" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="headingMd" as="h2">
                  Select Products to Compare
                </Text>
                <InlineStack gap="200">
                  <TextField
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    autoComplete="off"
                  />
                  <Popover
                    active={popoverActive}
                    activator={activator}
                    onClose={togglePopover}
                  >
                    <ActionList
                      items={sortOptions.map(option => ({
                        content: option.label,
                        onAction: () => {
                          setSortBy(option.value);
                          setPopoverActive(false);
                        },
                      }))}
                    />
                  </Popover>
                </InlineStack>
              </div>

              <Text variant="bodyMd" color="subdued">
                Select 2-4 products to compare. Currently selected: {selectedProducts.length}
              </Text>

              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "text"]}
                headings={["Product", "Price", "Status", "Inventory", "Created"]}
                rows={productRows}
              />

              <InlineStack gap="200">
                <Button
                  primary
                  onClick={handleCompare}
                  disabled={selectedProducts.length < 2}
                >
                  Compare Selected Products ({selectedProducts.length})
                </Button>
                <Button onClick={() => setSelectedProducts([])}>
                  Clear Selection
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {comparisonActive && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text variant="headingMd" as="h2">
                    Product Comparison
                  </Text>
                  <InlineStack gap="200">
                    <Button onClick={handleSaveComparison}>
                      Save Comparison
                    </Button>
                    <Button onClick={() => setComparisonActive(false)}>
                      Close Comparison
                    </Button>
                  </InlineStack>
                </div>

                <DataTable
                  columnContentTypes={["text", ...selectedProducts.map(() => "text")]}
                  headings={["Attribute", ...selectedProducts.map((p) => p.title)]}
                  rows={comparisonRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>

      <Modal
        open={saveModalActive}
        onClose={() => setSaveModalActive(false)}
        title="Save Comparison"
        primaryAction={{
          content: "Save",
          onAction: handleSaveComparisonSubmit,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setSaveModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Comparison Name"
              value={comparisonName}
              onChange={setComparisonName}
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}