export async function fetchModels() {
  // Amazon Bedrock Native requires the AWS SDK (e.g. @aws-sdk/client-bedrock)
  // Because the AWS SDK is not in the dependencies of this project, we return a clear error.
  
  throw new Error(
    "Amazon Bedrock native model fetching requires the AWS SDK (@aws-sdk/client-bedrock). " +
    "Since AWS SDK is not installed in the backend package.json, this adapter is marked as PARTIAL/BLOCKED. " +
    "Please install the SDK to enable this functionality."
  );
}
