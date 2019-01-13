export interface Aggregate {
    sum: number[];
    max: number[];
}
export interface HierarchyNode {
    id: number;
    name: string;
    parentIds: number[];
    parentNames: string[];
    children: any;
    depth: number;
    aggregate: Aggregate;
}
