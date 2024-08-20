import PostalMime from 'postal-mime'

async function streamToArrayBuffer(stream, streamSize) {
  let result = new Uint8Array(streamSize);
  let bytesRead = 0;
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result.set(value, bytesRead);
    bytesRead += value.length;
  }
  return result;
}

async function makeRequest(url, params) {
  const response = await fetch(url, params);
  return await response.json();
}

export default {
  async email(message, env) {
    const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
    const parsedEmail = await new PostalMime.parse(rawEmail);
    let text = parsedEmail.text;
    const allowedSenders = JSON.parse(env.allowedSenders);
    if (!allowedSenders.addresses.includes(message.from)) {
      message.setReject(`${message.from} is NOT Allowed`);
      return false;
    }
    if (text.length <= 0) {
      return false;
    }
    else {
      const credential = {
        "identifier": env.identifier,
        "password": env.password
      };
      const createSessionParams = {
        "method": "post",
        "headers": {
          "Content-Type": "application/json; charset=UTF-8"
        },
        "body": JSON.stringify(credential)
      };
      const session = await makeRequest(sessionUrl, createSessionParams);
      const content = {
        "repo": session.did,
        "collection": "app.bsky.feed.post",
        "record": {
          "text": text.trim(),
          "createdAt": (new Date()).toISOString(),
          "langs": ["ja"],
          "via": via
        }
      };
      const requestHeader = {
        "method": "post",
        "headers": {
          "Authorization": `Bearer ${session.accessJwt}`,
          "Content-Type": "application/json; charset=UTF-8"
        },
        "body": JSON.stringify(content)
      };
      const record = await makeRequest(createRecordUrl, requestHeader);
      console.log(record);
    }
  }
};
