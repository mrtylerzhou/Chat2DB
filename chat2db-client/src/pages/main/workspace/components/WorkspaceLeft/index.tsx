import React, { memo, useState, useEffect, useRef, useContext, useMemo } from 'react';
import { connect } from 'umi';
import i18n from '@/i18n';
import classnames from 'classnames';
import Iconfont from '@/components/Iconfont';
import LoadingContent from '@/components/Loading/LoadingContent';
import { Cascader, Divider } from 'antd';
import historyService from '@/service/history';
import { IConnectionModelType } from '@/models/connection';
import { IWorkspaceModelType } from '@/models/workspace';
import Tree from '../Tree';
import { treeConfig } from '../Tree/treeConfig';
import { TreeNodeType, ConsoleStatus } from '@/constants';
import { ITreeNode } from '@/typings';
import { IConsole } from '@/typings';
import styles from './index.less';
import { State } from '@/components/StateIndicator';

interface IProps {
  className?: string;
}

const dvaModel = connect(
  ({ connection, workspace }: { connection: IConnectionModelType; workspace: IWorkspaceModelType }) => ({
    connectionModel: connection,
    workspaceModel: workspace,
  }),
);

const WorkspaceLeft = memo<IProps>(function (props) {
  const { className } = props;
  return (
    <div className={classnames(styles.box, className)}>
      <div className={styles.header}>
        <RenderSelectDatabase />
      </div>
      <RenderSaveBox></RenderSaveBox>
      <Divider className={styles.divider} />
      <RenderTableBox />
    </div>
  );
});

interface Option {
  value: string;
  label: string;
  children?: Option[];
}

interface IProps {
  connectionModel: IConnectionModelType['state'];
  workspaceModel: IWorkspaceModelType['state'];
  dispatch: any;
}

function handleDatabaseAndSchema(databaseAndSchema: IWorkspaceModelType['state']['databaseAndSchema']) {
  let newCascaderOptions: Option[] = [];
  if (databaseAndSchema?.databases) {
    newCascaderOptions = (databaseAndSchema?.databases || []).map((t) => {
      let schemasList: Option[] = [];
      if (t.schemas) {
        schemasList = t.schemas.map((t) => {
          return {
            value: t.name,
            label: t.name,
          };
        });
      }
      return {
        value: t.name,
        label: t.name,
        children: schemasList,
      };
    });
  } else if (databaseAndSchema?.schemas) {
    newCascaderOptions = (databaseAndSchema?.schemas || []).map((t) => {
      return {
        value: t.name,
        label: t.name,
      };
    });
  }
  return newCascaderOptions;
}

const RenderSelectDatabase = dvaModel(function (props: IProps) {
  const { connectionModel, workspaceModel, dispatch } = props;
  const { databaseAndSchema, curWorkspaceParams } = workspaceModel;
  const { curConnection } = connectionModel;
  const [currentSelectedName, setCurrentSelectedName] = useState('');

  const cascaderOptions = useMemo(() => {
    const res = handleDatabaseAndSchema(databaseAndSchema);
    if (!curWorkspaceParams?.dataSourceId || curWorkspaceParams?.dataSourceId !== curConnection?.id) {
      // 如果databaseAndSchema 发生切变 并且没选中确切的database时，需要默认选中第一个
      const curWorkspaceParams = {
        dataSourceId: curConnection?.id,
        databaseSourceName: curConnection?.alias,
        databaseName: res?.[0]?.value,
        schemaName: res?.[0]?.children?.[0]?.value,
        databaseType: curConnection?.type,
      };
      dispatch({
        type: 'workspace/setCurWorkspaceParams',
        payload: curWorkspaceParams,
      });
    }
    return res;
  }, [databaseAndSchema]);

  useEffect(() => {
    if (curWorkspaceParams) {
      const { databaseName, schemaName, databaseSourceName } = curWorkspaceParams;
      const currentSelectedArr = [databaseSourceName, databaseName, schemaName].filter((t) => t);
      setCurrentSelectedName(currentSelectedArr.join('/'));
    }
  }, [curWorkspaceParams]);

  const onChange: any = (valueArr: any, selectedOptions: any) => {
    let labelArr: string[] = [];
    labelArr = selectedOptions.map((t: any) => {
      return t.label;
    });

    const curWorkspaceParams = {
      dataSourceId: curConnection?.id,
      databaseSourceName: curConnection?.alias,
      databaseName: labelArr[0],
      schemaName: labelArr[1],
      databaseType: curConnection?.type,
    };

    dispatch({
      type: 'workspace/setCurWorkspaceParams',
      payload: curWorkspaceParams,
    });
  };

  const dropdownRender = (menus: React.ReactNode) => <div>{menus}</div>;

  return (
    <div className={styles.selectDatabaseBox}>
      <Cascader
        popupClassName={styles.cascaderPopup}
        options={cascaderOptions}
        onChange={onChange}
        bordered={false}
        dropdownRender={dropdownRender}
      >
        <div className={styles.currentDatabase}>
          <div className={styles.name}>
            {currentSelectedName || <span style={{ opacity: 0.8 }}>{i18n('workspace.cascader.placeholder')}</span>}{' '}
          </div>
          <Iconfont code="&#xe608;" />
        </div>
      </Cascader>
      {/* <div className={styles.otherOperations}>
        <div className={styles.iconBox}>
          <Iconfont code="&#xec08;" />
        </div>
      </div> */}
    </div>
  );
});

const RenderTableBox = dvaModel(function (props: any) {
  const { workspaceModel } = props;
  const { curWorkspaceParams } = workspaceModel;
  const [initialData, setInitialData] = useState<ITreeNode[]>([]);

  useEffect(() => {
    if (curWorkspaceParams?.dataSourceId) {
      getInitialData();
    }
  }, [curWorkspaceParams]);

  function getInitialData() {
    treeConfig[TreeNodeType.TABLES].getChildren!({
      pageNo: 1,
      pageSize: 999,
      ...curWorkspaceParams,
      extraParams: curWorkspaceParams,
    }).then((res) => {
      setInitialData(res);
    });
  }

  return (
    <div className={styles.table_box}>
      <div className={styles.left_box_title}>Table</div>
      <LoadingContent data={initialData} handleEmpty>
        <Tree className={styles.tree} initialData={initialData}></Tree>
      </LoadingContent>
    </div>
  );
});

const RenderSaveBox = dvaModel(function (props: any) {
  const { workspaceModel, dispatch } = props;
  const { curWorkspaceParams, consoleList } = workspaceModel;

  useEffect(() => {
    dispatch({
      type: 'workspace/fetchGetSavedConsole',
      payload: {
        pageNo: 1,
        pageSize: 999,
        status: ConsoleStatus.RELEASE,
        ...curWorkspaceParams,
      },
    });
  }, [curWorkspaceParams]);

  return (
    <div className={styles.save_box}>
      <div className={styles.left_box_title}>Saved</div>
      <div className={styles.saveBoxList}>
        <LoadingContent data={consoleList} handleEmpty>
          {consoleList?.map((t: IConsole) => {
            return (
              <div key={t.id} className={styles.saveItem}>
                {t.name}
              </div>
            );
          })}
        </LoadingContent>
      </div>
    </div>
  );
});

export default dvaModel(WorkspaceLeft);