import { Topic, TopicGroup } from '@prisma/client'
import type { NextPageWithLayout } from '../@types/types'
import Button from '../components/Button'
import AdminLayout from '../layout/AdminLayout'
import getActiveOrganization from '../util/getActiveOrganization'
import withAdminAccess from '../util/withAdminAccess'
import Modal from '../components/Modal'
import { useEffect, useState } from 'react'
import { Form, Formik } from 'formik'
import Input from '../components/Input'
import { createTopicGroup, getTopicGroups, getTopics, patchTopic } from '../lib/api/topics'
import Select from '../components/Select'
import { ID } from '../lib/types'

interface Props {
    organizationId: string
}

interface RowProps {
    organizationId: string
    label: string
    id: ID
    handleSubmit: () => void
}

const Row = ({ label, topic_group, id, organizationId, handleSubmit }: RowProps) => {
    const [modalOpen, setModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleAddTopicToGroup = async ({
        topicGroup,
        newTopicGroup,
    }: {
        topicGroup: string
        newTopicGroup: string
    }) => {
        setLoading(true)
        let topicGroupId = topicGroup
        if (newTopicGroup) {
            const topicGroupRes = await createTopicGroup(newTopicGroup.trim())
            topicGroupId = topicGroupRes?.body?.id
        }
        await patchTopic({ organizationId, id, topicGroupId })
        setModalOpen(false)
        handleSubmit()
        setLoading(false)
    }

    return (
        <>
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Formik
                    initialValues={{ topicGroup: '', newTopicGroup: '' }}
                    validateOnMount
                    validate={(values) => {
                        const errors: {
                            topicGroup?: string
                        } = {}
                        if (!values.topicGroup && !values.newTopicGroup) {
                            errors.topicGroup = 'Required'
                        }

                        return errors
                    }}
                    onSubmit={({ newTopicGroup, topicGroup }) => handleAddTopicToGroup({ newTopicGroup, topicGroup })}
                >
                    {() => {
                        return (
                            <Form>
                                <TopicGroupForm loading={loading} organizationId={organizationId} />
                            </Form>
                        )
                    }}
                </Formik>
            </Modal>
            <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                    <p>{label}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    <button onClick={() => setModalOpen(true)} className="text-red font-semibold">
                        {topic_group?.label || 'Add to a group'}
                    </button>
                </td>
            </tr>
        </>
    )
}

const TopicGroupForm = ({ organizationId, loading }) => {
    const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([])
    const [createNewGroup, setCreateNewGroup] = useState(false)

    useEffect(() => {
        getTopicGroups(organizationId).then(({ data }) => {
            setTopicGroups(data)
        })
    }, [])

    return (
        <>
            {createNewGroup ? (
                <Input label="New group" placeholder="New group" id="new-topic-group" name="newTopicGroup" />
            ) : (
                <Select
                    label="Topic groups"
                    id="topic-group"
                    name="topicGroup"
                    options={topicGroups.map(({ label, id }) => {
                        return { name: label, value: id }
                    })}
                />
            )}
            {createNewGroup ? (
                <button
                    className="text-red font-semibold -mt-4 block"
                    onClick={(e) => {
                        e.preventDefault()
                        setCreateNewGroup(false)
                    }}
                >
                    Add to existing group
                </button>
            ) : (
                <button
                    className="text-red font-semibold -mt-4 block"
                    onClick={(e) => {
                        e.preventDefault()
                        setCreateNewGroup(true)
                    }}
                >
                    Create new group
                </button>
            )}

            <div className="flex items-center mt-4 space-x-6">
                <Button loading={loading} disabled={loading}>
                    Add
                </Button>
            </div>
        </>
    )
}

const TopicsLayout: React.VoidFunctionComponent<Props> = ({ organizationId }) => {
    const [topics, setTopics] = useState<Topic[]>([])

    useEffect(() => {
        getTopics(organizationId).then(({ data }) => setTopics(data))
    }, [])

    return (
        <>
            <div className="flex flex-col mt-8">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden border-b shadow border-gray-light-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                                        >
                                            Label
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                                        >
                                            Group
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {topics.map((topic) => (
                                        <Row
                                            handleSubmit={() => {
                                                getTopics(organizationId).then(({ data }) => setTopics(data))
                                            }}
                                            key={topic.id + ''}
                                            organizationId={organizationId}
                                            {...topic}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

const Topics: NextPageWithLayout<Props> = ({ organizationId }) => {
    return <TopicsLayout organizationId={organizationId} />
}

Topics.getLayout = function getLayout(page) {
    return <AdminLayout title={'Topics'}>{page}</AdminLayout>
}

export const getServerSideProps = withAdminAccess({
    redirectTo: () => '/login',
    async getServerSideProps(context) {
        const organizationId = await getActiveOrganization(context)

        return {
            props: { organizationId },
        }
    },
})

export default Topics
