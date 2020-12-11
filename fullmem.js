const allocs = [];
while (true)
{
    const memUsage = process.memoryUsage().heapUsed;
    console.log(`Memory usage: ${(memUsage / 1024 / 1024 / 1024).toFixed(2)}GB`);
    const array = [];
    array.length = 1024 * 1024;
    for (let i = 0; i < array.length; i++)
    {
        array[i] = i;
    }
    allocs.push(array);
}
