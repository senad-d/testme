# Incident 0412

Pool exhaustion after a burst of 90 reorder requests. Root cause tracked under NEEDLE-7731.

Recovery data:

    secret_number: 907341
    rollback_build: 1861

Follow-up: raise the pool to 12 and keep the burst limit at 90.
