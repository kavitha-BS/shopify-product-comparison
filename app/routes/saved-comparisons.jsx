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
  DataTable,
  Modal,
  EmptyState,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  const comparisons = await prisma.comparisonSet.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });
  
  return json({ comparisons });
};

export default function SavedComparisons() {
  const { comparisons } = useLoaderData();
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [modalActive, setModalActive] = useState(false);

  const handleViewComparison = useCallback((comparison) => {
    setSelectedComparison(comparison);
    setModalActive(true);
  }, []);

  const handleDeleteComparison = useCallback(async (comparisonId) => {
    try {
      await fetch(`/api/comparisons/${comparisonId}`, {
        method: "DELETE",
      });
      // Refresh the page or update state
      window.location.reload();
    } catch (error) {
      console.error("Error deleting comparison:", error);
    }
  }, []);

  const comparisonRows = comparisons.map((comparison) => [
    comparison.name,
    JSON.parse(comparison.products).length,
    new Date(comparison.createdAt).toLocaleDateString(),
    <InlineStack gap="200" key={comparison.id}>
      <Button size="slim" onClick={() => handleViewComparison(comparison)}>
        View
      </Button>
      <Button
        size="slim"
        tone="critical"
        onClick={() => handleDeleteComparison(comparison.id)}
      >
        Delete
      </Button>
    </InlineStack>,
  ]);

  const selectedProducts = selectedComparison ? JSON.parse(selectedComparison.products) : [];
  
  const comparisonDetailsRows = selectedProducts.length > 0 ? [
    ["Product", ...selectedProducts.map((p) => p.title)],
    ["Price", ...selectedProducts.map((p) => `$${p.variants[0]?.price || "0.00"}`)],
    ["Status", ...selectedProducts.map((p) => p.status)],
    ["Inventory", ...selectedProducts.map((p) => p.variants[0]?.inventory_quantity || 0)],
    ["Vendor", ...selectedProducts.map((p) => p.vendor || "Unknown")],
    ["Product Type", ...selectedProducts.map((p) => p.product_type || "Uncategorized")],
  ] : [];

  return (
    <Page>
      <TitleBar title="Saved Comparisons" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Your Saved Product Comparisons
              </Text>

              {comparisons.length === 0 ? (
                <EmptyState
                  heading="No saved comparisons yet"
                  action={{
                    content: "Create Comparison",
                    url: "/",
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Save your product comparisons to access them later.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "numeric", "text", "text"]}
                  headings={["Name", "Products", "Created", "Actions"]}
                  rows={comparisonRows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        large
        open={modalActive}
        onClose={() => setModalActive(false)}
        title={selectedComparison?.name || "Comparison Details"}
        secondaryActions={[
          {
            content: "Close",
            onAction: () => setModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          {selectedProducts.length > 0 && (
            <DataTable
              columnContentTypes={["text", ...selectedProducts.map(() => "text")]}
              headings={["Attribute", ...selectedProducts.map((p) => p.title)]}
              rows={comparisonDetailsRows}
            />
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}