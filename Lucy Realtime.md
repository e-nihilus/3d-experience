# Lucy 2.1 VTON Realtime

> Realtime Try On experience with Decart Lucy 2.1 VTON


## Overview

- **Endpoint**: `https://fal.run/decart/lucy2-vton/realtime`
- **Model ID**: `decart/lucy2-vton/realtime`
- **Category**: video-to-video
- **Kind**: inference


## Pricing

- **Price**: $0.02 per seconds

For more details, see [fal.ai pricing](https://fal.ai/pricing).

## API Information

This model can be used via our HTTP API or more conveniently via our client libraries.
See the input and output schema below, as well as the usage examples.


### Input Schema

The API accepts the following input parameters:


- **`prompt`** (`string`, _optional_):
  Text prompt for the real-time transformation. Default value: `"Substitute the current top with the outfit from the reference image, matching its color, material, and fit"`
  - Default: `"Substitute the current top with the outfit from the reference image, matching its color, material, and fit"`

- **`image_url`** (`string`, _optional_):
  Image data URI or HTTP(S) URL for realtime frame input. Data URI format: data:image/<type>;base64,... Default value: `""`
  - Default: `""`

- **`reference_image_url`** (`string`, _optional_):
  Reference image URL or data URI. When set, Lucy 2 will use this as a character reference for the transformation. Default value: `"https://v3b.fal.media/files/b/0a985506/y57_APcgGHlPxOOHIOqYO_15129.png"`
  - Default: `"https://v3b.fal.media/files/b/0a985506/y57_APcgGHlPxOOHIOqYO_15129.png"`



**Required Parameters Example**:

```json
{}
```

**Full Example**:

```json
{
  "prompt": "Substitute the current top with the outfit from the reference image, matching its color, material, and fit",
  "reference_image_url": "https://v3b.fal.media/files/b/0a985506/y57_APcgGHlPxOOHIOqYO_15129.png"
}
```


### Output Schema

The API returns the following output format:



**Example Response**:

```json
{}
```


## Usage Examples

### cURL

```bash
curl --request WEBSOCKET \
  --url https://fal.run/decart/lucy2-vton/realtime \
  --header "Authorization: Key $FAL_KEY" \
  --header "Content-Type: application/json" \
  --data '{}'
```

### Python

Ensure you have the Python client installed:

```bash
pip install fal-client
```

Then use the API client to make requests:

```python
import fal_client

def on_queue_update(update):
    if isinstance(update, fal_client.InProgress):
        for log in update.logs:
           print(log["message"])

result = fal_client.subscribe(
    "decart/lucy2-vton/realtime",
    arguments={},
    with_logs=True,
    on_queue_update=on_queue_update,
)
print(result)
```

### JavaScript

Ensure you have the JavaScript client installed:

```bash
npm install --save @fal-ai/client
```

Then use the API client to make requests:

```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("decart/lucy2-vton/realtime", {
  input: {},
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);
console.log(result.requestId);
```


## Additional Resources

### Documentation

- [Model Playground](https://fal.ai/models/decart/lucy2-vton/realtime)
- [API Documentation](https://fal.ai/models/decart/lucy2-vton/realtime/api)
- [OpenAPI Schema](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=decart/lucy2-vton/realtime)

### fal.ai Platform

- [Platform Documentation](https://docs.fal.ai)
- [Python Client](https://docs.fal.ai/clients/python)
- [JavaScript Client](https://docs.fal.ai/clients/javascript)