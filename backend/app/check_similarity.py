from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

query = "who am i?"
memory = "Aarohan is a 4th semester BSCS undergrad doing a NestJS + NextJS internship for fullstack development, but doesn't know JavaScript that well. He's asking for a rough rundown since he's only worked with these frameworks for a few weeks and may have missed some things."

query_embedding = model.encode(query)
memory_embedding = model.encode(memory)

# Compute cosine similarity
similarity = util.cos_sim(query_embedding, memory_embedding)

print(f"Query: {query}")
print(f"Memory: {memory}")
print(f"Similarity: {similarity.item()}")
